function ajaxHandler (data) {
	if (data.html) {
		if (data.html.main) {
			$('#main').replaceWith(data.html.main);
		}
		if (data.html.header) {
			$('#header').replaceWith(data.html.header);
		}
		if (data.html.footer) {
			$('#footer').replaceWith(data.html.footer);
		}
	}
	
	if (data.historyState) {
		window.history.pushState({}, "", data.historyState);
	}
	
	if (data.sentencesRow) {
		window.sentenceData = data.sentencesRow;
	}
	
	if (data.alertString) {
		$('form').trigger('reset');
		alert(data.alertString);
	}
	
	if (data.locals) {
		$('#dev-locals > p').text(JSON.stringify(data.locals));
	}
	
	$('input').attr('autocomplete', 'off');
}

$(function () {
	var socket = io.connect();
	socket.on('updateMaxTypingSpeed', function (maxTypingSpeed) {
		if ($('#footer_speed-max')) {
			$('#footer_speed-max').text(maxTypingSpeed);
		}
	});
	socket.on('updateDashboard', function () {
		if ($('#main_dashboard').length) {
			$.get('/dashboard').done(ajaxHandler);
		}
	});
	
	$(document).on('click', '#footer_show-dashboard', function(event) {
		$.get('/dashboard').done(ajaxHandler);
	});
	
	$(document).on('paste', 'input', function (event) {
		event.preventDefault();
	});
	$(document).on('click', '#main_login_input-start', function (event) {
		event.preventDefault();
		
		var studentID = {
			number: $('#main_login_input-studentNumber').val(),
			name: $('#main_login_input-studentName').val()
		}
		
		$.post('/login', studentID).done(ajaxHandler);
	});
	
	$(document).on('click', '#main_login_input-end, #footer_hide-dashboard', function (event) {
		event.preventDefault();
		$.get('/login').done(ajaxHandler);
	});
	
	$(document).one('keyup', '#main_typing_input', function () { // 타자 속도 측정을 시작했을 때
		var typing = new Typing(window.sentenceData);
		
		$(document).on('keypress', '#main_typing_input', function (event) {
			if (event.keyCode == 13) {
				if ($(this).val() == typing.sentenceData.sentence) {
					clearInterval(typing.getSpeedInterval);
					typing.resultSpeed = (typing.resultSpeed || typing.getSpeed());
					$('#footer_speed-current').text(typing.resultSpeed);
					
					var data = {
						inputText: $('#main_typing_input').val(),
						resultSpeed: typing.resultSpeed
					}
					$.post('/typing', data).done(ajaxHandler);
				}
			} else {
				// change style
			}
		});
	});
	
	function Typing (sentencesRow) {
		var that = this;
		this.sentenceData = sentencesRow;
		this.startedTime = new Date().getTime();
		
		this.getDiffTime = function () {
			return (new Date().getTime() - this.startedTime) / (1000 * 60);
		}
		
		this.getSpeed = function () {
			var typingCount = Hangul.disassemble($('#main_typing_input').val()).length;
			if (this.getDiffTime()) {
				return Math.floor(typingCount / this.getDiffTime());
			}
		}
		this.getSpeedInterval = setInterval(function () {
				$('#footer_speed-current').text(that.getSpeed());
			}, 0.2 * 1000);
	}
	
});