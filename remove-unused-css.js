/*!
 * Remove unused CSS
 * https://github.com/commeta/remove-unused-css
 * Copyright 2020 Commeta
 * Released under the GPL v3 or MIT license
 * 
 * eslint-disable no-var,no-console
 * fork: Detect unused CSS selectors Copyright Victor Homyakov
 * https://gist.github.com/victor-homyakov/aefd2ed05a050b1068c667d829a17419
 */

(function() {
	window.onload= function() {
		'use strict';
		
		let div= document.createElement('div'); // Панель управления, вывод на странице в подвале слой fixed
		div.style= "position:fixed;bottom:0;left:0;background-color:red;width:100%;z-index:16777271;padding:15px;opacity:0.85;color:white;overflow-y:scroll;max-height:90px;";
		div.innerHTML= `
			<strong>Не использовано: </strong>
			<span id="unused-css-rules">0</span> CSS правил.
			<span id="manual-mode"></span>
		`;
		
		var buttons_operations_unused= `
			<button id="saveCSSrules" onclick="window.save_css()">Сохранить правила</button>
			<button onclick="window.save_css('generate')">Сгенерировать файлы</button>
		`;
		
		document.body.append(div);
		window.rules_files= {};


		var parsedRules = parseCssRules();
		console.log('Parsed CSS rules:', parsedRules);
		
		detectDuplicateSelectors(parsedRules);
		var selectorsToTrack = getSelectorsToTrack(parsedRules);
		
		window.selectorStats = {
			unused: [],
			added: [],
			removed: []
		};
		
		console.log('Tracking style usage (inspect window.selectorStats for details)...');
		
		window.rules_length= parsedRules.style.length;
		
		function scanRules(){
			var parsedCssRules= parseCssRules();
			var newSelectors = getSelectorsToTrack(parsedCssRules);
			
			// Calculation order for removed/added/unused is significant
			var removed = Object.keys(selectorsToTrack).filter(selector => newSelectors[selector] === undefined);
			var added = Object.keys(newSelectors).filter(selector => {
				if(selectorsToTrack[selector] === undefined) {
					selectorsToTrack[selector] = 0;
					return true;
				}
				return false;
			});
			
			var unused = Object.keys(selectorsToTrack).filter(selector => {
				if(document.querySelector(selector)) {
					selectorsToTrack[selector]++;
				}
				return selectorsToTrack[selector] === 0;
			});
			
			
			var message = [];
			if(unused.length !== window.selectorStats.unused.length) {
				message.push(unused.length + ' unused');
				
				let unusedcssrules= document.getElementById("unused-css-rules");
				if(unusedcssrules) {
					if(unused.length == 0) unusedcssrules.innerHTML= `<i style="color:black;">${unused.length}</i>`;
					else unusedcssrules.innerHTML= unused.length;
				}
			}
			
			window.selectorStats.unused = unused;
			
			if(typeof( window.unused_length ) != "undefined" && window.unused_length > unused.length){
				let saveCSSrules= document.getElementById("saveCSSrules"); 
				if(saveCSSrules) saveCSSrules.disabled= false;
			}
			
			if(typeof( window.unused_length ) != "undefined" && window.rules_length < parsedCssRules.style.length){
				window.rules_length= parsedCssRules.style.length;
				let saveCSSrules= document.getElementById("saveCSSrules"); 
				if(saveCSSrules) saveCSSrules.disabled= false;
			}
			
			
			if(added.length > 0) {
				message.push(added.length + ' added');
				window.selectorStats.added = added;
			}
			
			if(removed.length > 0) {
				message.push(removed.length + ' removed', removed);
				window.selectorStats.removed = removed;
			}
			
			if(message.length > 0) {
				console.log('Selectors: ' + message.join(', '));
			}
		}
		

		window.save_css= function(mode= false) {
			if( window.rules_length < 1 || parsedRules.filesCSS.length < 1 || window.selectorStats.unused.length < 1){
				document.getElementById("manual-mode").innerHTML= buttons_operations_unused;
				return;
			}
			
			let upload = {
				"filesCSS": parsedRules.filesCSS,
				"rules_files": window.rules_files,
				"rules_length": window.rules_length,
				"unused": window.selectorStats.unused,
				"pathname": window.location.pathname,
				"host":  window.location.protocol + "//" + window.location.hostname,
				"mode": "save"
			};
			
			
			if(mode == 'generate') {
				upload['mode']= "generate";
				document.getElementById("manual-mode").innerHTML= `Файлы генерируются, ждите...`;
			}
			
			
			let data = new FormData();
			data.append("json", JSON.stringify(upload));

			fetch("/remove-unused-css/remove-unused-css.php", {
				method: "POST",
				body: data
			}).then(response => {
				if(response.status !== 200) {
					return Promise.reject();
				}
				return response.json();
			}).then(function(data) {
				if(typeof( data.status ) != "undefined"){
					if(data.status == "complete"){
						document.getElementById("manual-mode").innerHTML= buttons_operations_unused;
						document.getElementById("saveCSSrules").disabled= true;
						
						window.unused_length= data.unused_length;
						window.rules_length= data.rules_length;
					}
					
					if(data.status == "generate"){
						let files= '';
						data.created.forEach(function(file, index, created) {
							files += '<br />' + file;
						});
						
						let removed= buttons_operations_unused;
						if(typeof( data.removed ) != "undefined" && data.removed > 0) removed= `Удалено: ${data.removed} классов, `;
						
						document.getElementById("manual-mode").innerHTML= `
							${removed} 
							Сгенерированы новые css файлы: ${files}
						`;
					}
				}
			}).catch(() => console.log('ошибка'));
		}
		
		
		setInterval(function() {
			scanRules();
		}, 1000);
		
		
		// wait 1s, and save rules page
		setTimeout(function() { 
			scanRules();
			window.save_css(true);
		}, 1500);


		window.addEventListener("unload", function() {
			window.save_css(true);
		});


		function array_unique(arr) {
			var seen = {};
			var ret_arr = [];
			var key;
			var i;

			function keyify(obj) {
				var ret = "";
				var j;
				if(Object.prototype.toString.call(obj) === "[object Object]" || Object.prototype.toString.call(obj) === "[object Array]") {
					for(j in obj) {
						ret += "~" + j + "^" + keyify(obj[j]) + "%";
					}
					return ret;
				} else {
					return obj;
				}
			}
			for(i = 0; i < arr.length; i++) {
				key = keyify(arr[i]);
				if(!(key in seen)) {
					ret_arr.push(arr[i]);
					seen[key] = true;
				}
			}
			return ret_arr;
		}


		function parseCssRules() {
			var styleSheets = document.styleSheets,
				parsedRules = {
					fontFaces: [],
					keyframes: [],
					media: [],
					style: [],
					support: [],
					unknown: [],
					filesCSS: []
				};

			for(var i = 0; i < styleSheets.length; i++) {
				var styleSheet = styleSheets[i];
				var rules;
				
				try {
					rules = styleSheet.cssRules; // styleSheet.rules
				} catch(e) {
					if(styleSheet.ignored) {
						continue;
					}
					
					console.log(e.name + ' while accessing style sheet', styleSheet.ownerNode);
					styleSheet.ignored = true;
					
					if(e.name === 'SecurityError') {
						// Security error when accessing cross-origin style sheet.
						// Possible workaround if we want to analyze content: fetch styleSheet.href
						// (will anyways have problems with relative urls and @import).
						// https://discourse.mozilla.org/t/webextensions-porting-access-to-cross-origin-document-stylesheets-cssrules/18359
						// Appended style sheet will be discovered in the next iteration
						loadStyleSheet(styleSheet.href, styleSheet.ownerNode);
					}
					continue;
				}
				
				if( styleSheet.href ){
					parsedRules.filesCSS.push(styleSheet.href);
					parsedRules.filesCSS= array_unique(parsedRules.filesCSS);
				}
				
				
				for(var j = 0; j < rules.length; j++) {
					var rule = rules[j];
					var ruleClass = Object.prototype.toString.call(rule).replace(/\[object (.+)]/, '$1');
					
					switch(ruleClass) {
						case 'CSSFontFaceRule':
							parsedRules.fontFaces.push( rule.cssText.replace(/\r?\n/g, "").replace(/\s+/g, ' ').trim() );
							break;
						case 'CSSKeyframesRule':
							parsedRules.keyframes.push( rule.cssText.replace(/\r?\n/g, "").replace(/\s+/g, ' ').trim() );
							break;
						case 'CSSMediaRule':
							// if (rule.conditionText)
							parsedRules.media.push(rule.conditionText);
							break;
						case 'CSSStyleRule':
							// if (rule.selectorText)
							parsedRules.style.push(rule.selectorText);
							// rule.cssText
							
							if( typeof( window.rules_files[rule.parentStyleSheet.href] ) != "undefined" ){
								if( !window.rules_files[rule.parentStyleSheet.href].includes(rule.selectorText) ){
									window.rules_files[rule.parentStyleSheet.href].push(rule.selectorText);
								}
							} else {
								let file= [rule.selectorText];
								window.rules_files[rule.parentStyleSheet.href]= file;
							}
							
							//arr.includes(elem);
							break;
						case 'CSSSupportsRule':
							parsedRules.support.push(rule.conditionText);
							break;
						default:
							parsedRules.unknown.push(rule);
					}
				}
			}
			return parsedRules;
		}

		function loadStyleSheet(href, node) {
			// node.parentNode.removeChild(node);
			fetch(href).then(response => response.text()).then(css => {
				var style= document.createElement('style');
				// style.innerText = css; inserts line breaks as `<br>`
				style.innerHTML= css;
				// Insert before the original style sheet.
				// This way broken relative URLs will be fixed by the original rules.
				node.parentNode.insertBefore(style, node);
			});
		}

		function detectDuplicateSelectors(parsedRules) {
			var seenSelectors = {},
				duplicatedSelectors = [],
				duplicatedSequence = [];
				
			parsedRules.style.forEach(function(selector) {
				if(selector in seenSelectors) {
					duplicatedSelectors.push(selector);
					duplicatedSequence.push(selector);
				} else {
					seenSelectors[selector] = true;
					if(duplicatedSequence.length > 5) {
						console.warn('Duplicated sequence of selectors:', duplicatedSequence);
					}
					duplicatedSequence = [];
				}
			});
			
			if(duplicatedSelectors.length > 0) {
				console.log('List of all duplicated selectors:', duplicatedSelectors);
			}
		}

		function getSelectorsToTrack(parsedRules) {
			return parsedRules.style.filter(function(selector) {
				return !(selector === 'html' || selector.includes(':hover') || selector.includes('::after') || selector.includes('::before'));
			}).reduce(function(selectors, selector) {
				selectors[selector] = 0;
				return selectors;
			}, {});
		}
	};
}());
