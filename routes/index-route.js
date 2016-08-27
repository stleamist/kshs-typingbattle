// MODULES
var express = require('express');
var router = express.Router();

var ejs = require('ejs');
var hangul = require('hangul-js');

// MIDDLEWARE
//// VARIABLES
var modeDev = function (req, res, next) {
	res.locals.env = 'dev';
	next();
}
//// CONNECTION
/*router.use(modeDev); */

// ROUTES
//// CONNECTION
router.get('/', function (req, res, next) {
	if (req.xhr) {
		
	} else {
		res.locals.showFooterLink = {
			isRoot: true
		}
		req.session.destroy();
		res.render('index');
	}
});

router.get('/login', function (req, res, next) {
	if (req.xhr) {
		res.locals.showFooterLink = {
			isRoot: true
		}
		res.render('index_main-login', function (err, htmlMain) {
			res.render('index_header', function (err, htmlHeader) {
				res.render('index_footer', function (err, htmlFooter) {
					var data = {
						html: {
							main: htmlMain,
							header: htmlHeader,
							footer: htmlFooter
						},
						historyState: "/",
						locals: res.locals
					}
					res.status(200).send(data);
				});
			});
		});
	}
})

router.post('/login', function (req, res, next) {
	if (req.xhr) {
		var studentID = {
			number: req.body.number,
			name: req.body.name
		}
		
		req.app.db.query('SELECT * FROM typebattle_students WHERE number=? AND name=?;', [studentID.number, studentID.name], function (err, students) {
			if (students[0] && students[0].didType < 1) {
				req.session.studentID = studentID;
				res.locals.loginStatus = "success";
				next();
			} else {
				var data = {
					alertString: ""
				}
				if (!students[0]) {
					data.alertString = "해당 학생은 존재하지 않습니다. 이름과 학번을 확인해 주세요.";
				} else if (students[0].didType >= 1) {
					data.alertString = "죄송합니다. 배틀은 최대 1번까지 참가할 수 있습니다.";
				}
				res.status(200).send(data);
			}
		});
	} else {
		
	}
}, function (req, res, next) {
	if (req.xhr) {
		var studentID = req.session.studentID;
		req.app.db.query('SELECT * FROM typebattle_sentences ORDER BY rand() LIMIT 1;', function (err, sentences) {
			req.app.db.query('UPDATE typebattle_students SET sentenceID=? WHERE number=? AND name=?;', [sentences[0].id, studentID.number, studentID.name], function (err) {
				req.app.db.query('SELECT * FROM typebattle_students ORDER BY typingSpeed DESC LIMIT 1;', function (err, students) {
					res.locals.sentencesRow = sentences[0];
					res.locals.studentID = studentID;
					res.locals.theFirst = students[0];
					
					res.render('index_main-typing', function (err, htmlMain) {
						res.render('index_header', function (err, htmlHeader) {
							res.render('index_footer', function (err, htmlFooter) {
								var data = {
									html: {
										main: htmlMain,
										header: htmlHeader,
										footer: htmlFooter
									},
									sentencesRow: sentences[0],
									locals: res.locals
								}
								res.status(200).send(data);
							});
						});
					});
				});
			});
		});
	} else {
		
	}
});

router.post('/typing', function (req, res, next) {
	if (req.xhr) {
		req.app.db.query('SELECT * FROM typebattle_sentences INNER JOIN typebattle_students ON typebattle_sentences.id = typebattle_students.sentenceID WHERE number=? AND name=?;', [req.session.studentID.number, req.session.studentID.name], function (err, rows) {
			if (req.body.inputText == rows[0].sentence) {
				req.app.db.query('UPDATE typebattle_students SET typingSpeed=?, didType=didType+1, didType_time=now() WHERE number=? AND name=?;', [req.body.resultSpeed, req.session.studentID.number, req.session.studentID.name], function (err) {
					var rankQuerySentence = "SELECT * FROM (";
						rankQuerySentence += "	SELECT *,";
						rankQuerySentence += "		CASE";
						rankQuerySentence += "			WHEN @prev_value = typingSpeed THEN @vRank";
						rankQuerySentence += "			WHEN @prev_value := typingSpeed THEN @vRank := @vRank + 1";
						rankQuerySentence += "		END AS rank";
						rankQuerySentence += "	FROM typebattle_students AS p, (SELECT @vRank := 0, @prev_value := NULL) AS r";
						rankQuerySentence += "	ORDER BY typingSpeed DESC";
						rankQuerySentence += ") AS CNT WHERE number=? AND name=?";
					req.app.db.query(rankQuerySentence, [req.session.studentID.number, req.session.studentID.name], function (err, students) {
						var prevRankQuerySentence = "SELECT * FROM (";
							prevRankQuerySentence += "	SELECT *,";
							prevRankQuerySentence += "		CASE";
							prevRankQuerySentence += "			WHEN @prev_value = typingSpeed THEN @vRank";
							prevRankQuerySentence += "			WHEN @prev_value := typingSpeed THEN @vRank := @vRank + 1";
							prevRankQuerySentence += "		END AS rank";
							prevRankQuerySentence += "	FROM typebattle_students AS p, (SELECT @vRank := 0, @prev_value := NULL) AS r";
							prevRankQuerySentence += "	WHERE NOT (number=? AND name=?)";
							prevRankQuerySentence += "	ORDER BY typingSpeed DESC";
							prevRankQuerySentence += ") AS CNT WHERE rank=?";
						req.app.db.query(prevRankQuerySentence, [req.session.studentID.number, req.session.studentID.name, students[0].rank], function (err, prevStudents) {
							res.locals.studentID = req.session.studentID;
							res.locals.result = {
								studentRank: students[0].rank
							}
							
							req.app.io.sockets.emit('updateDashboard', {});
							req.app.io.sockets.emit('updateAdmin', {});
							
							if (prevStudents[0]) {
								res.locals.result.prevRankStudent = prevStudents[0].name;
							}
							if (students[0].rank == 1) {
								console.log('socket');
								req.app.io.sockets.emit('updateMaxTypingSpeed', students[0].typingSpeed);
							}
							
							res.render('index_main-done', function (err, htmlMain) {
								console.log(err);
								var data = {
									html: {
										main: htmlMain,
									},
									locals: res.locals
								}
								res.status(200).send(data);
							});
						});
					});
				});
			}
			console.log(req.body);
		});
	} else {
		
	}
});

router.get('/dashboard', function (req, res, next) {
	if (req.xhr) {
		var rankQuerySentence = "SELECT *,\n";
			rankQuerySentence += "	CASE\n";
			rankQuerySentence += "		WHEN @prev_value = typingSpeed THEN @vRank\n";
			rankQuerySentence += "		WHEN @prev_value := typingSpeed THEN @vRank := @vRank + 1\n";
			rankQuerySentence += "	END AS rank\n";
			rankQuerySentence += "FROM typebattle_students AS p, (SELECT @vRank := 0, @prev_value := NULL) AS r\n";
			rankQuerySentence += "WHERE didType>=1\n";
			rankQuerySentence += "ORDER BY typingSpeed DESC;";
		req.app.db.query(rankQuerySentence, function (err, students) {
			res.locals.students = students;
			res.render('dashboard', function (err, htmlMain) {
				res.locals.showFooterLink = {
					isRoot: false
				}
				res.render('index_footer', function (err, htmlFooter) {
					var data = {
						html: {
							main: htmlMain,
							footer: htmlFooter
						},
						historyState: "/",
						locals: res.locals
					}
					res.status(200).send(data);
				});
			});
		});
	} else {
		
	}
})

router.get('/admin', function (req, res, next) {
	req.app.db.query('SELECT number, name, sentence FROM typebattle_students INNER JOIN typebattle_sentences ON typebattle_sentences.id = typebattle_students.sentenceID ORDER BY didType_time DESC;', function (err, rows) {
		console.log(err);
		console.log(rows);
		res.locals.rows = rows;
		if (req.xhr) {
			res.render('admin');
		} else {
			res.render('admin-layout');
		}
	})
});

// EXPORTS
module.exports = router;