window.sentenceData = <%- JSON.stringify(locals.sentenceData) %>

$(document).ready(function () {
	var socket = io.connect();
	
	var el = {
		main: {
			typing: {
				input: $('#main_typing_input')
			}
		},
		footer: {
			speed: {
				current: $('#footer_speed-current'),
				max: $('#footer_speed-max')
			}
		}
	}
	
	var Typing = function (sentenceDataParam) {
		this.sentenceData = sentenceDataParam;
		this.startedTime = new Date().getTime();
		
		this.getDiffTime = function () {
			return (new Date().getTime() - this.startedTime) / (1000 * 60);
		}
		this.getSpeed = function () {
			var typingCount = Hangul.disassemble(el.main.typing.input.val()).length;
			if (this.getDiffTime()) {
				return Math.floor(typingCount / this.getDiffTime());
			}
		}
	}
	
	el.main.typing.input.one('keyup', function () {
		var typing = new Typing(window.sentenceData);
		var getSpeedInterval = setInterval(function () {
				el.footer.speed.current.text(typing.getSpeed());
			}, 0.2 * 1000);
		
		el.main.typing.input.on('keypress', function (event) {
			if (event.keyCode == 13) {
				if (el.main.typing.input.val() == typing.sentenceData.sentence) {
					var studentTypingSpeed = typing.getSpeed();
					clearInterval(getSpeedInterval);
					$.post('/typebattle/typing', studentTypingSpeed).done(ajaxHandler);
				}
			} else {
				// change style
			}
		});
	});
	
	
	socket.on('updateMaxTypingSpeed', function (maxTypingSpeed) {
		// locals.maxSpeed = maxSpeed;
		el.footer.speed.max.text(maxTypingSpeed);
	});
});