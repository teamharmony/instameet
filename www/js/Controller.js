var Controller = function () {
	var hostUrl = "http://localhost:8080/ResourceMgmt",
	clientId = "meetMePal",
	userLoggedIn,
	loginBy = "normal",
	locationTimer,
	messageMeetingTime,
	meetingTimers = [];
//"http://gazidevworks.org:8080/ResourceMgmt",
	var controller = {

		_self : null,
		_latlng : null,
		initialize : function () {
			_self = this;
			this.bindEvents();

			$(document).delegate("#page-welcome", "pagebeforeshow", function () {
				_self.welcome();
			});

			$(document).delegate("#page-login", "pagebeforeshow", function () {
				_self.login();
			});

			$(document).delegate("#page-edit", "pagebeforeshow", function () {
				_self.editView();
			});

			$(document).delegate("#page-signup", "pagebeforeshow", function () {
				_self.signup();
			});

			$(document).delegate("#page-forgot", "pagebeforeshow", function () {
				_self.forgotPassword();
			});

			$(document).delegate("#page-resetPassword", "pagebeforeshow", function () {
				_self.resetPassword();
			});

			$(document).delegate("#page-home", "pagebeforeshow", function () {
				_self.homeview();
			});

			/*$(document).delegate("#page-profile", "pagebeforeshow", function () {
			_self.profile();
			});*/

			$(document).delegate("#page-messages", "pagebeforeshow", function (e, data) {
				_self.message(e, data);
			});

			$(document).delegate("#page-messageView", "pagebeforeshow", function (e, data) {
				_self.messageView(e, data);
			});

			$(document).delegate("#page-meetings", "pagebeforeshow", function () {
				_self.meeting();
			});

			$(document).delegate("#page-meetingView", "pagebeforeshow", function () {
				_self.meetingView();
			});

			$(document).delegate("#page-feedback", "pagebeforeshow", function () {
				_self.feedback();
			});
		},

		bindEvents : function () {
			//document.addEventListener("backbutton", _self.backButtonHandler, false);
		},

		backButtonHandler : function (event) {
			alert('Back button pressed');
		},

		welcome : function () {
						
			openFB.init({
				appId : '1442578949379728'
			});

			openGL.init({
				appId : '105396803775-7cu06be67flqbt6j9792ikf8rccb7ant.apps.googleusercontent.com'
			});

			$('#btn-fb').off('click');
			$('#btn-fb').on('click', function (evt) {
				openFB.getLoginStatus(function (response) {
					if (response.status === "connected") {
						_self.fbLogin();
					} else {
						openFB.login(function (response) {
							if (response.status === 'connected') {
								_self.fbLogin();
							} else {
								alert('Facebook login failed: ' + response.error);
							}
						}, {
							scope : 'email,read_stream'
						});
					}
				});
				evt.preventDefault();
			});

			$('#btn-gl').off('click');
			$('#btn-gl').on('click', function(evt) {
				openGL.getLoginStatus(function(response) {
					if (response.status === "connected") {
						_self.glLogin();
					} else {
						openGL.login(function(response) {
							if (response.status === 'connected') {
								_self.glLogin();
							} else {
								alert('Google login failed: ' + response.error);
							}
						}, {scope: 'openid profile email'});
					}
				});
				evt.preventDefault();
			});
		},

		clearTimers : function () {
			clearInterval(timer);
		},

		setTimers : function () {
			timer = setInterval(function () {
					_self.updateLocation();
					_self.getMessageMeeting();
				}, 600000);
		},

		glLogin : function () {
			function loginSuccess() {
				_self.updateLocation();
				_self.getMessageMeeting();
				_self.setTimers();
				$.mobile.navigate("#page-home");
				userLoggedIn = "glAdmin";
				loginBy = "gl";
			};

			function refreshTokenFailure() {
				$.mobile.navigate("#page-welcome");
			};

			function passwordFailure() {
				alert('Invalid Username and Password');
			};

			var authentication = new AuthenticationProxy(hostUrl, clientId, loginSuccess, refreshTokenFailure, passwordFailure);
			authentication.loginWithPassword('glAdmin', 'glAdmin');
		},

		fbLogin : function () {
			function loginSuccess() {
				_self.updateLocation();
				_self.getMessageMeeting();
				_self.setTimers();
				$.mobile.navigate("#page-home");
				userLoggedIn = "adminfb";
				loginBy = "fb";
			};

			function refreshTokenFailure() {
				$.mobile.navigate("#page-welcome");
			};

			function passwordFailure() {
				alert('Invalid Username and Password');
			};

			var authentication = new AuthenticationProxy(hostUrl, clientId, loginSuccess, refreshTokenFailure, passwordFailure);
			authentication.loginWithPassword('adminfb', 'adminfb');
		},

		login : function () {
			this.$login = $("#page-login");
			$('#userId', this.$login).val("");
			$('#password', this.$login).val("");

			$('#btn-login').off('click');
			$('#btn-login').on('click', function () {
				_self.loading('show');
				this.$login = $("#page-login");
				var userId = $('#userId', this.$login).val(),
				pass = $('#password', this.$login).val();
				userLoggedIn = userId;
				function loginSuccess() {
					_self.updateLocation();
					_self.isResetPassRequired();
					_self.getMessageMeeting();
					_self.setTimers();
					loginBy = "normal";
				};

				function refreshTokenFailure() {
					_self.loading('hide');
					$.mobile.navigate("#page-login");
				};

				function passwordFailure() {
					_self.loading('hide');
					alert('Invalid Username and Password');
				};

				var authentication = new AuthenticationProxy(hostUrl, clientId, loginSuccess, refreshTokenFailure, passwordFailure);
				authentication.loginWithPassword(userId, pass);
			});
		},

		onLogout : function () {
			if (loginBy === "normal") {
				$.ajax({
					url : hostUrl.concat("/logout?access_token=" + window.bearerToken),
					type : 'GET'
				}).done(function () {
					$.mobile.navigate('#page-welcome');
				});
			} else if (loginBy === "fb") {
				openFB.logout(function () {
					$.mobile.navigate('#page-welcome');
				});
			}
			_self.clearTimers();
			window.bearerToken = null;
			window.refresh_token = null;
		},

		isResetPassRequired : function () {
			$.ajax({
				url : hostUrl.concat("/password/reset?access_token=" + window.bearerToken),
				type : 'GET',
				data : {
					"username" : userLoggedIn
				}
			}).done(function (data) {
				if (data == 0) {
					$.mobile.navigate('#page-home');
				} else {
					$.mobile.navigate('#page-resetPassword');
				}
				_self.loading('hide');
			});
		},

		forgotPassword : function () {
			this.$forgotPass = $('#page-forgot');
			$('#forgot', this.$forgotPass).val("");

			$('#forgotPassForm').off('submit');
			$('#forgotPassForm').submit(function (e) {
				this.$forgotPass = $('#page-forgot');
				var username = $('#forgot', this.$forgotPass).val();

				if (username === "") {
					alert("Enter username.");
				} else {
					_self.loading("show");
					$.ajax({
						url : hostUrl.concat("/password/forgot"),
						type : 'PUT',
						data : {
							"username" : username
						},
					}).done(function (o) {
						_self.loading("hide");
						$.mobile.navigate('#page-login');
					});
				}
				e.preventDefault();
			});
		},

		resetPassword : function () {
			this.$resetPass = $('#page-resetPassword');
			$('#tempPass', this.$resetPass).val("");
			$('#newPass', this.$resetPass).val("");
			$('#confirmPass', this.$resetPass).val("");

			$('#resetPassForm').off('submit');
			$('#resetPassForm').submit(function (e) {
				this.$resetPass = $('#page-resetPassword');

				var oldPass = $('#tempPass', this.$resetPass).val();
				var pass = $('#newPass', this.$resetPass).val();
				var confirmPass = $('#confirmPass', this.$resetPass).val();

				if (oldPass === "") {
					alert("Temporary Password can not be empty.");
				} else if (pass !== confirmPass) {
					alert("Password and Confirm Password needs to be same.");
				} else {
					_self.loading("show");
					$.ajax({
						url : hostUrl.concat("/password/reset?access_token=" + window.bearerToken),
						type : 'PUT',
						data : {
							"username" : userLoggedIn,
							"password" : pass
						}
					}).done(function (o) {
						_self.loading("hide");
						$.mobile.navigate('#page-home');
					});
				}
				e.preventDefault();
			});
		},

		validateEmail : function (email) {
			var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
			return re.test(email);
		},

		signup : function () {
			_self.drawCaptcha();
			var that = this;
			this.$signUp = $('#page-signup');
			this.$name = $('#name', this.$signUp);
			this.$skills = $('#skills', this.$signUp);
			this.$contact = $('#contact', this.$signUp);
			this.$username = $('#username', this.$signUp);
			this.$error = $('#error', this.$signUp);
			this.$email = $('#email', this.$signUp);
			this.$pass = $('#password', this.$signUp);
			this.$confirmPass = $('#confirmPass', this.$signUp);
			this.$txtCaptcha = $('#captcha', this.$signUp);
			this.$btnUpload = $("#btnUpload", this.$signUp);
			this.$imgDisp = $("imgDisp", this.$signUp);

			this.$name.val("");
			this.$skills.val("");
			this.$contact.val("");
			this.$username.val("");
			this.$email.val("");
			this.$pass.val("");
			this.$confirmPass.val("");
			this.$pass.val("");
			this.$txtCaptcha.val("");
			this.$imgDisp.attr('src', '');

			$("#registrationscreenpart1").show();
			$("#registrationscreenpart2").hide();

			this.$username.off('focusout');
			this.$username.on('focusout', function (e) {
				that.$username.removeClass('invalidInp');
				$.ajax({
					url : hostUrl + "/validate/username",
					type : 'POST',
					data : "username=" + that.$username.val(),
					processData : false,
					contentType : "application/x-www-form-urlencoded"
				}).done(function (data) {
					if (data === 1) {
						that.$username.addClass('invalidInp');
						that.$error.text("Invalid Username.");
						that.$error.removeClass('display');
					} else {
						that.$username.removeClass('invalidInp');
						that.$error.text("");
						that.$error.addClass('display');
					}
				}).fail(function (jqXHR, textStatus, errorThrown) {
					//alert(jqXHR + ":" + textStatus + ":" + errorThrown);
					//alert(jqXHR.responseText);
				});
				e.preventDefault();
			});

			this.$email.off('focusout');
			this.$email.on('focusout', function (e) {
				that.$email.removeClass('invalidInp');
				if (!_self.validateEmail(that.$email.val())) {
					that.$email.addClass('invalidInp');
					that.$error.text("Invalid Email.");
					that.$error.removeClass('display');
				} else {
					$.ajax({
						url : hostUrl + "/validate/email",
						type : 'POST',
						data : "email=" + that.$email.val(),
						processData : false,
						contentType : "application/x-www-form-urlencoded"
					}).done(function (data) {
						if (data === 1) {
							that.$email.addClass('invalidInp');
							that.$error.text("Invalid Email.");
							that.$error.removeClass('display');
						} else {
							that.$email.removeClass('invalidInp');
							that.$error.text("");
							that.$error.addClass('display');
						}
					}).fail(function (jqXHR, textStatus, errorThrown) {
						//alert(jqXHR + ":" + textStatus + ":" + errorThrown);
						//alert(jqXHR.responseText);
					});
				}
				e.preventDefault();

			});

			$('#captcha').off("focusout", _self.validateCaptcha);
			$('#captcha').on("focusout", _self.validateCaptcha);

			that.pic = null;
			this.$btnUpload.off('click');
			this.$btnUpload.on('click', function (event) {
				navigator.camera.getPicture(onCapturePhotoSuccess, onCapturePhotoError, {
					destinationType : navigator.camera.DestinationType.FILE_URI,
					sourceType : navigator.camera.PictureSourceType.PHOTOLIBRARY
				});

				function onCapturePhotoSuccess(imageData) {
					window.resolveLocalFileSystemURI(imageData, gotFileEntry, failSystem);
				}

				function gotFileEntry(fileEntry) {
					//convert all file to base64 formats
					fileEntry.file(function (file) {
						var reader = new FileReader();
						reader.onloadend = function (evt) {
							$('#imgDisp').attr('src', evt.target.result);

							that.pic = _self.dataURItoBlob(evt.target.result);
						};
						reader.readAsDataURL(file);
					}, function (message) {
						alert('Failed because: ' + message);
					});
				}

				function failSystem() {
					alert('failed');
				}

				function onCapturePhotoError(message) {
					alert('Captured Failed because: ' + message);
				}

				event.preventDefault();
			});

			$('#regVisible').off('change');
			$('#regVisible').on('change', function () {
				var bol = $("#regVisible").is(":checked") ? 1 : 0;
				$('#regVisible').val(bol);
			});

			$('#btnContinue').off('click');
			$('#btnContinue').on("click", function (e) {
				if (that.$name.val() != "" && that.$skills.val() != "" && that.$contact.val() != "") {
					$("#registrationscreenpart1").hide();
					$("#registrationscreenpart2").show();
				} else {
					alert("Name, skills and contact can not be empty.");
				}
				e.preventDefault();
			});

			$('#btnRegSubmit').off('click');
			$('#btnRegSubmit').on('click', function (e) {
				if (that.$pass.val() !== that.$confirmPass.val()) {
					alert("Password and Confirm Password needs to be same.");
				} else if (that.$username.val() != "" && that.$email.val() != "" && that.$pass.val() != "" && that.$confirmPass.val() != "") {
					_self.loading('show');
					var formData = new FormData($("#form-register")[0]);
					if (that.pic !== null) {
						formData.append('profilePic', that.pic);
					}

					$.ajax({
						url : hostUrl + "/resources",
						type : 'POST',
						data : formData,
						processData : false,
						contentType : false
					}).done(function (data) {
						_self.loading('hide');
						//_self.updateLocation();
						$.mobile.navigate('#page-login');
					}).fail(function (jqXHR, textStatus, errorThrown) {
						_self.loading('hide');
						alert("Could not register user. Please contact your administrator.");
						//alert(jqXHR + ":" + textStatus + ":" + errorThrown);
						//alert(jqXHR.responseText);
					});
				} else {
					alert("Username, email and password can not be empty.");
				}
				e.preventDefault();
			});
		},

		loading : function (showOrHide) {
			setTimeout(function () {
				$.mobile.loading(showOrHide);
			}, 1);
		},
		onLocationError : function (error) {
			//alert(error.code);
		},

		updateLocation : function () {
			navigator.geolocation.getCurrentPosition(function (position) {
				var lat = position.coords.latitude,
				lon = position.coords.longitude;
				_self._latlng = {
					"latitude" : lat,
					"longitude" : lon
				};

				$.ajax({
					url : hostUrl.concat("/resources/updateLocation?access_token=" + window.bearerToken),
					type : 'PUT',
					data : _self._latlng
				}).done(function (data, textStatus, jqXHR) {
					console.log("location updated successfully.");
				});
			}, _self.onLocationError);

		},

		homeview : function () {
			if (loginBy === "fb") {
				$('#btnEditProfile').css('display', 'none');
			} else {
				$('#btnEditProfile').css('display', 'block');
			}

			$('#btnSearch').off('click', _self.onSearchClick);
			$('#btnSearch').on('click', _self.onSearchClick);

			$('#btnLogout').off('click', _self.onLogout);
			$('#btnLogout').on('click', _self.onLogout);

			$('#btnEditProfile').off('click');
			$('#btnEditProfile').on('click', function (e) {
				if (loginBy === "fb") {}
				else {
					$.mobile.navigate('#page-edit');
				}
			});
			_self.loading("show");
			map.init(_self.onMapSuccess);
		},

		onMapSuccess : function (lat, lng) {
			var obj = map.getLatLongRange(lat, lng);
			$.ajax({
				url : hostUrl.concat("/search/location"),
				type : 'GET',
				data : obj
			}).done(function (user) {
				if (user.length > 0) {
					map.showOnMap(user);
					_self.renderListView(user);
				} else {}
				_self.loading("hide");
			});

		},

		onSearchClick : function () {

			_self.setSearchView(true);

			$('#btnBack').off('click');
			$('#btnBack').on('click', function (evt) {
				_self.setSearchView(false);
			});
			$('#search-input').val("");
			/*$('#radio-choice-h-2a').prop("checked", true);
			$('#radio-choice-h-2b').prop("checked", false);
			$('#radio-choice-h-2c').prop("checked", false);*/
			$('#search-input').off("change");
			$('#search-input').change(function (event) {
				_self.loading("show");
				var obj = $(this);
				_self.search(event);
			});
		},

		search : function (evt) {
			var selectValue = $('#search-choice').val();
			if (selectValue === 'name') {
				_self.searchByName();
			} else if (selectValue === 'skill') {
				_self.searchBySkill();
			} else if (selectValue === 'city') {
				_self.searchByLocation();
			}
		},

		searchByName : function () {
			var name = $('#search-input').val();
			$.ajax({
				url : hostUrl.concat("/search/name?name=" + name),
				type : 'GET'
			}).done(function (user) {
				if (user.length > 0) {
					map.showOnMap(user);
					_self.renderListView(user);
				} else {
					alert("No result found for current search criteria.");
				}
				_self.loading("hide");
			});
		},

		searchBySkill : function () {
			var skill = escape($('#search-input').val());
			$.ajax({
				url : hostUrl.concat("/search/skills?skills=" + skill),
				type : 'GET'
			}).done(function (user) {
				if (user.length > 0) {
					map.showOnMap(user);
					_self.renderListView(user);
				} else {
					alert("No result found for current search criteria.");
				}
				_self.loading("hide");
			});
		},

		searchByLocation : function () {
			var addr = $('#search-input').val();
			map.getLatlongAddress(addr, function (lat, lng) {
				var obj = map.getLatLongRange(lat, lng);
				$.ajax({
					url : hostUrl.concat("/search/location"),
					type : 'GET',
					data : obj
				}).done(function (user) {
					if (user.length > 0) {
						map.showOnMap(user);
						_self.renderListView(user);
					} else {
						alert("No result found for current search criteria.");
					}
					_self.loading("hide");
				});
			});
		},

		setSearchView : function (flag) {
			if (flag) {
				$('#leftSideMenu').addClass('display');
				$('#btnSearch').addClass('display');
				$('#title').addClass('display');
				$('#btnMessageIcon').addClass('display');
				$('#messCount').addClass('display');
				$('#btnMeetingIcon').addClass('display');
				$('#meetCount').addClass('display');
				$('#filterSearchDiv').removeClass('display');
				//$('#search-choice').removeClass('display');
				//$('#search-input').removeClass('display');
				$('#btnBack').removeClass('display');
			} else {
				$('#leftSideMenu').removeClass('display');
				$('#btnSearch').removeClass('display');
				$('#title').removeClass('display');
				$('#btnMessageIcon').removeClass('display');
				$('#messCount').removeClass('display');
				$('#btnMeetingIcon').removeClass('display');
				$('#meetCount').removeClass('display');
				//$('#search-input').addClass('display');
				$('#filterSearchDiv').addClass('display');
				//$('#search-choice').addClass('display');
				$('#btnBack').addClass('display');
			}

		},

		renderListView : function (data) {

			$list = $('#list');
			$list.empty();
			$list.data("userInfo", data);
			$list.off('click', 'li', _self.onListClick);
			$list.on('click', 'li', _self.onListClick);
			var count = 0;
			for (var i in data) {
				var obj = data[i];
				if (obj.username !== userLoggedIn) {
					var p1 = map.getLatLng(obj.latitude, obj.longitude);
					var p2 = map.getLatLng(_self._latlng.latitude, _self._latlng.longitude);
					var uDist = map.getDistanceFromLatLng(p1, p2);

					$list.append("<li class='listItem' id='" + obj.username + "'><div class='ltProfilePicDiv'><img class='ltProfilePic' src='img/defaultImg.png'/></div><div class='ltInfoDiv'><h1 class='list-name'>" + obj.name + "</h1><p class='list-skill'>" + obj.skills + " </p><p class='list-miles'>" + uDist + " Miles </p></div></li>");

					$listItem = $('#' + obj.username);

					$.ajax({
						url : hostUrl + "/profilePic/" + obj.username,
						type : 'GET',
						context : $listItem,
						async : true
					}).done(function (dataURL) {
						if (dataURL) {
							$(this).find('img').attr('src', 'data:image/png;base64,' + dataURL);
						}
					});
				}
			}
		},

		onListClick : function (oEvent) {
			var that = this,
			uInfo;
			var userInfo = $('#list').data('userInfo');
			var obj = oEvent.currentTarget;
			if (obj.tagName === "LI") {
				this.uName = obj.id;
				$.each(userInfo, function (index, value) {
					if (value.username === that.uName) {
						uInfo = value;
						return false;
					}
				});
				var p1 = map.getLatLng(uInfo.latitude, uInfo.longitude);
				var p2 = map.getLatLng(_self._latlng.latitude, _self._latlng.longitude);
				var uDist = map.getDistanceFromLatLng(p1, p2);

				$('#imgProfileUser').attr('src', 'img/defaultImg.png');
				$.ajax({
					url : hostUrl + "/profilePic/" + uInfo.username,
					type : 'GET',
					async : true
				}).done(function (dataURL) {
					$('#imgProfileUser').attr('src', 'data:image/png;base64,' + dataURL);
				});

				$('#txtUName').text(uInfo.name);
				$('#txtUSkills').text(uInfo.skills);
				$('#txtUDistance').text(uDist + " miles");

				this.$profilePage = $("#page-profile");
				this.$uName = $('#txtUName', this.$profilePage);

				$('#txtTo').val(uInfo.username);
				$('#txtTo').attr("disabled", "disabled");

				$('#txtToMeeting').val(uInfo.username);
				$('#txtToMeeting').attr("disabled", "disabled");

				_self.showProfile();
			}
		},

		profile : function () {
			$.ajax({
				url : hostUrl + "/resources/fetch?access_token=" + window.bearerToken,
				type : 'GET'
			}).done(function (user) {
				//alert(user);
			});
		},

		showProfile : function () {
			$.mobile.navigate('#page-profile');
		},

		meeting : function () {
			var that = this;
			this.$meetings = $('#page-meetings');
			this.$toMeeting = $('#txtToMeeting', this.$meetings);
			this.$agendaMeeting = $('#txtAgendaMeeting', this.$meetings).val("");
			this.$datetimeMeeting = $('#txtDatetimeMeeting', this.$meetings).val("");
			this.$venueMeeting = $('#txtVenueMeeting', this.$meetings).val("");
			this.$descMeeting = $('#taDescMeeting', this.$meetings).val("");

			this.$btnSendMeetingReq = $('#btnSendMeetingReq', this.$meetings);

			this.$btnSendMeetingReq.off('click');
			this.$btnSendMeetingReq.on('click', function (e) {
				var dtVal = that.$datetimeMeeting.val().replace("T", " ");
				var milliSec = Date.parse(dtVal);
				var date = new Date();
				date.setTime(milliSec);
				_self.loading("show");
				$.ajax({
					url : hostUrl.concat("/meetings?access_token=" + window.bearerToken),
					type : 'POST',
					data : {
						'toUserName' : that.$toMeeting.val(),
						'agenda' : that.$agendaMeeting.val(),
						'details' : that.$descMeeting.val(),
						'dateTime' : (date.getTime() / 1000),
						'venue' : that.$venueMeeting.val()
					}
				}).done(function () {
					_self.getMessageMeeting();
					_self.loading("hide");
					alert("Meeting request sent successfully");
					that.$agendaMeeting.val("");
					that.$datetimeMeeting.val("");
					that.$venueMeeting.val("");
					that.$descMeeting.val("");
				});
				e.preventDefault();
			});
		},

		meetingView : function () {
			_self.getMessageMeeting();
			$('#meeting-view').css('display', 'none');
			$('#meetingListView').css('display', 'block');

			$('#btnBackMeetingView').off('click');
			$('#btnBackMeetingView').on('click', function () {
				if ($('#meeting-view').css('display') === "block") {
					_self.meetingView();
				} else {
					$.mobile.navigate('#page-home');
				}
			});

			$('#meetingError').addClass('display');
			if (_self.meetings.length === 0) {
				$('#meeting-view').css('display', 'none');
				$('#meetingListView').css('display', 'none');
				$('#meetingError').removeClass('display');
				return;
			}

			var $meetinglist = $('#meetingList');
			$meetinglist.empty();
			$meetinglist.data("userInfo", _self.meetings);
			
			$meetinglist.off('click', 'li');
			$meetinglist.on('click', 'li', function (evt) {
				var obj = evt.currentTarget,
				meetingObj;
				if (obj.tagName === "LI") {
					for (var i = 0; i < _self.meetings.length; i++) {
						if (_self.meetings[i].id === parseInt(obj.id)) {
							meetingObj = _self.meetings[i];
							break;
						}
					}

					var img = null;
					if (meetingObj.fromUserName !== null) {
						img = meetingObj.fromUserName;
					} else {
						img = meetingObj.toUserName;
					}
					$.ajax({
						url : hostUrl + "/profilePic/" + img,
						type : 'GET',
						async : true
					}).done(function (dataURL) {
						$('#meetingUPic').attr('src', 'data:image/png;base64,' + dataURL);
					});

					var date = new Date();
					date.setTime(meetingObj.datetime * 1000);

					$('#uMeetingsName').text(meetingObj.name);
					$('#uMeetingAgenda').text(meetingObj.agenda);
					$('#uMeetingDatetime').text(date.toString());
					$('#uMeetingVenue').text(meetingObj.venue);
					$('#uMeetingDesc').text(meetingObj.details);

					$('#meetingListView').css('display', 'none');
					$('#meeting-view').css('display', 'block');

					$('#btn-Reject').css('display', 'none');
					$('#btn-Accept').css('display', 'none');

					if (meetingObj.fromUserName === null) {
						if (meetingObj.status === 0) {
							$('#uMeetingDesc').text("The reciver has not yet accepted the meeting.");
						} else if (meetingObj.status === 1) {
							$('#uMeetingDesc').text("The reciver has accepted the meeting.");
						} else if (meetingObj.status === -1) {
							$('#uMeetingDesc').text("The reciver has rejected the meeting.");
						}
					} else {
						if (meetingObj.status === -1) {
							$('#uMeetingDesc').text("You have rejected the meeting.");
						} else if (meetingObj.status === 1) {
							$('#uMeetingDesc').text("You have accepted the meeting.");
						} else {
							$('#btn-Reject').css('display', 'block');
							$('#btn-Accept').css('display', 'block');
							$('#btn-Reject').off("click", _self.updateMeetingStatus);
							$('#btn-Reject').on("click", {
								id : meetingObj.id,
								status : "-1"
							}, _self.updateMeetingStatus);

							$('#btn-Accept').off("click", _self.updateMeetingStatus);
							$('#btn-Accept').on("click", {
								id : meetingObj.id,
								status : "1"
							}, _self.updateMeetingStatus);
						}
					}
				}
			});

			for (var i in _self.meetings) {
				var obj = _self.meetings[i];
				if (obj.fromUserName !== null) {
					if (obj.fromStatus !== -1) {
						$meetinglist.append("<li id='" + obj.id + "' class='listItem messRecieve" + obj.status + "'><div class='ltProfilePicDiv'><img class='ltProfilePic' src='img/defaultImg.png'/></div><div class='ltInfoDiv'><h1 class='list-name'>" + obj.name + "</h1><p class='list-agenda'>" + obj.agenda + " </p></div><div class='recieveIcon'><span aria-hidden='true' class='glyphicon glyphicon-arrow-down'></span></div></li>");

						$meetinglistItem = $('#' + obj.id);
						$.ajax({
							url : hostUrl + "/profilePic/" + obj.fromUserName,
							type : 'GET',
							context : $meetinglistItem,
							async : true
						}).done(function (dataURL) {
							if (dataURL) {
								$(this).find('img').attr('src', 'data:image/png;base64,' + dataURL);
							}
						});
					}
				}
				if (obj.toUserName !== null) {
					if (obj.toStatus !== -1) {
						$meetinglist.append("<li id='" + obj.id + "' class='listItem messSend' ><div class='ltProfilePicDiv'><img class='ltProfilePic' src='img/defaultImg.png'/></div><div class='ltInfoDiv'><h1 class='list-name'>" + obj.name + "</h1><p class='list-agenda'>" + obj.agenda + " </p></div><div class='sentIcon'><span aria-hidden='true' class='glyphicon glyphicon-arrow-up'></span></div></li>");

						$meetinglistItem = $('#' + obj.id);
						$.ajax({
							url : hostUrl + "/profilePic/" + obj.toUserName,
							type : 'GET',
							context : $meetinglistItem,
							async : true
						}).done(function (dataURL) {
							if (dataURL) {
								$(this).find('img').attr('src', 'data:image/png;base64,' + dataURL);
							}
						});
					}
				}
			}
		},

		updateMeetingStatus : function (event) {
			var id = event.data.id,
			status = event.data.status;
			$.ajax({
				url : hostUrl.concat("/meetings/" + id + "?access_token=" + window.bearerToken),
				type : 'PUT',
				data : {
					'status' : status
				}
			}).done(function () {
				_self.getMessageMeeting();
				console.log("Message status updated");
				_self.meetingView();
			});
		},

		message : function (e, data) {
			var that = this;
			
			this.$messages = $('#page-messages');
			this.$to = $('#txtTo', this.$messages);
			this.$subject = $('#txtSubject', this.$messages).val("");
			this.$message = $('#taMessage', this.$messages).val("");

			this.$btnSendMessage = $('#btnSendMessage', this.$messages);
			this.$btnBack = $('#btnBack', this.$messages);

			this.$btnBack.off('click');
			this.$btnBack.on('click', function (e) {
				if (data.prevPage.attr('id') === 'page-messageView') {
					$.mobile.navigate('#' + data.prevPage.attr('id'), {
						fromPage : 'replyMessageScreen'
					});
				} else {
					$.mobile.navigate('#' + data.prevPage.attr('id'));
				}

			});
				
			this.$btnSendMessage.off('click');
			this.$btnSendMessage.on('click', function (e) {
				_self.loading("show");
				var replyMessData = $('#page-messages').data('replyMessData'), sendMessData = {}, parentId, topicId;
							
				if(replyMessData){
					parentId = replyMessData.id;
					if(replyMessData.topicId === -1){
						topicId = replyMessData.id;
					} else {
						topicId = replyMessData.topicId;
					}
					sendMessData = { 'parentId' : parentId,
									 'topicId': topicId,
									 'toUserName' : that.$to.val(),
									 'message' : that.$message.val()
									};
				} else {
					sendMessData = { 'toUserName' : that.$to.val(),
									 'message' : that.$message.val()
									};
				}
				$.ajax({
					url : hostUrl.concat("/messages?access_token=" + window.bearerToken),
					type : 'POST',
					data : sendMessData
				}).done(function () {
					_self.getMessageMeeting();
					_self.loading("hide");
					alert("Message sent successfully");
					that.$subject.val("");
					that.$message.val("");
				}).fail(function (jqXHR, textStatus, errorThrown) {
					//alert(JSON.stringify(jqXHR) + ":" + textStatus + ":" + errorThrown);
					//alert(JSON.stringify(jqXHR.getAllResponseHeaders()));
					_self.loading("hide");
				});
				e.preventDefault();
			});
		},

		messageView : function (e, data) {
			var that = this;
			$('#page-messages').removeData('replyMessData');
			_self.getMessageMeeting();
			$('#message-view').css('display', 'none');
			$('#messageListView').css('display', 'block');

			$('#btnBackMessView').off('click');
			$('#btnBackMessView').on('click', function () {
				if ($('#message-view').css('display') === "block") {
					_self.messageView();
				} else {
					$.mobile.navigate('#page-home');
				}
			});

			if(data && data.prevPage.attr('id') === 'page-messages') {
				$('#message-view').css('display', 'block');
				$('#messageListView').css('display', 'none');
			}

			$('#messageError').addClass('display');
			if (_self.messages.length === 0) {
				$('#message-view').css('display', 'none');
				$('#messageListView').css('display', 'none');
				$('#messageError').removeClass('display');
				return;
			}

			this.$messagelist = $('#messageList');
			this.$messagelist.empty();
			this.$messagelist.data("userInfo", _self.messages);
			
			this.$messagelist.off('click', 'li');
			this.$messagelist.on('click', 'li', function (evt) {
				var obj = evt.currentTarget,
				messObj,
				messData = $(this).data('messData');
				this.$messageViewListItem = $('#messViewList');
				this.$messageViewListItem.empty();
				if (obj.tagName === "LI") {
					var messArr =_self.messages[messData.topicId === -1 ? messData.id : messData.topicId];
					for (var i = 0; i < messArr.length; i++) {
						if(messArr[i].fromUserName !== null){
							this.$messageViewListItem.append('<li class="messageRecieve">'+ messArr[i].message +'</li>');
						} else {
							this.$messageViewListItem.append('<li class="messageSent">'+ messArr[i].message +'</li>');
						}
						
						$.ajax({
							url : hostUrl.concat("/messages/" + messArr[i].id + "?access_token=" + window.bearerToken),
							type : 'PUT',
							data : {
								'status' : '1'
							}
						}).done(function () {
							console.log("Message status updated");
						});
					}

					$('#uMessName').text(messData.name);
										
					var img = null;
					if (messData.fromUserName !== null) {
						img = messData.fromUserName;
					} else {
						img = messData.toUserName;
					}

					$.ajax({
						url : hostUrl + "/profilePic/" + img,
						type : 'GET'
					}).done(function (dataURL) {
						$('#messageUPic').attr('src', 'data:image/png;base64,' + dataURL);
					});

					$('#btnReplyMessage').off('click');
					$('#btnReplyMessage').on('click', function () {
						if (messData.fromUserName !== null) {
							$('#txtTo').val(messData.fromUserName);
						} else {
							$('#txtTo').val(messData.toUserName);
						}
						$('#txtTo').attr("disabled", "disabled");
						$('#page-messages').data('replyMessData',messData);
						$.mobile.navigate('#page-messages');
					});

					$('#messageListView').css('display', 'none');
					$('#message-view').css('display', 'block');
				}
			});
			
			$.each(_self.messages, function(index){
				var obj =this[this.length - 1];
				if (obj.fromUserName !== null) {
					if (obj.fromStatus !== -1) {
						that.$messagelist.append("<li id='" + obj.id + "' class='listItem messRecieve" + obj.toStatus + "'><div class='ltProfilePicDiv'><img class='ltProfilePic' src='img/defaultImg.png' /></div><div class='ltInfoDiv'><h1 class='list-name'>" + obj.name + "</h1><p class='list-subject'>" + obj.message + " </p></div><div class='recieveIcon'><span aria-hidden='true' class='glyphicon glyphicon-arrow-down'></span></div></li>");

						that.$messagelistItem = $('#' + obj.id);
						that.$messagelistItem.data('messData', obj);
						$.ajax({
							url : hostUrl + "/profilePic/" + obj.fromUserName,
							type : 'GET',
							context : that.$messagelistItem,
							async : true
						}).done(function (dataURL) {
							if (dataURL) {
								$(this).find('img').attr('src', 'data:image/png;base64,' + dataURL);
							}
						});
					}
				}
				if (obj.toUserName !== null) {
					if (obj.toStatus !== -1) {
						that.$messagelist.append("<li id='" + obj.id + "' class='listItem messSend' ><div class='ltProfilePicDiv'><img class='ltProfilePic' src='img/defaultImg.png' /></div><div class='ltInfoDiv'><h1 class='list-name'>" + obj.name + "</h1><p class='list-subject'>" + obj.message + " </p></div><div class='semtIcon'><span aria-hidden='true' class='glyphicon glyphicon-arrow-up'></span></div></li>");

						that.$messagelistItem = $('#' + obj.id);
						that.$messagelistItem.data('messData', obj);
						$.ajax({
							url : hostUrl + "/profilePic/" + obj.toUserName,
							type : 'GET',
							context : that.$messagelistItem,
							async : true
						}).done(function (dataURL) {
							if (dataURL) {
								$(this).find('img').attr('src', 'data:image/png;base64,' + dataURL);
							}
						});
					}
				}
				
			});
			/*for (var i in _self.messages) {
				var obj = _self.messages[i];
				if (obj.fromUserName !== null) {
					if (obj.fromStatus !== -1) {
						$messagelist.append("<li id='" + obj.id + "' class='listItem messRecieve" + obj.toStatus + "'><div class='ltProfilePicDiv'><img class='ltProfilePic' src='img/defaultImg.png' /></div><div class='ltInfoDiv'><h1 class='list-name'>" + obj.fromUserName + "</h1><p class='list-subject'>" + obj.subject + " </p></div><div class='recieveIcon'><span aria-hidden='true' class='glyphicon glyphicon-arrow-down'></span></div></li>");

						$messagelistItem = $('#' + obj.id);
						$.ajax({
							url : hostUrl + "/profilePic/" + obj.fromUserName,
							type : 'GET',
							context : $messagelistItem,
							async : true
						}).done(function (dataURL) {
							if (dataURL) {
								$(this).find('img').attr('src', 'data:image/png;base64,' + dataURL);
							}
						});
					}
				}
				if (obj.toUserName !== null) {
					if (obj.toStatus !== -1) {
						$messagelist.append("<li id='" + obj.id + "' class='listItem messSend' ><div class='ltProfilePicDiv'><img class='ltProfilePic' src='img/defaultImg.png' /></div><div class='ltInfoDiv'><h1 class='list-name'>" + obj.toUserName + "</h1><p class='list-subject'>" + obj.subject + " </p></div><div class='semtIcon'><span aria-hidden='true' class='glyphicon glyphicon-arrow-up'></span></div></li>");

						$messagelistItem = $('#' + obj.id);
						$.ajax({
							url : hostUrl + "/profilePic/" + obj.toUserName,
							type : 'GET',
							context : $messagelistItem,
							async : true
						}).done(function (dataURL) {
							if (dataURL) {
								$(this).find('img').attr('src', 'data:image/png;base64,' + dataURL);
							}
						});
					}
				}

			}*/
		},

		getMessageMeeting : function () {
			//var newMessCount = 0,
			var newMeetCount = 0;
			$.ajax({
				url : hostUrl.concat("/messages?access_token=" + window.bearerToken),
				type : 'GET',
				async : true
			}).done(function (message) {
				_self.messages = _self.parseMessages(message);
				var newMessCount = 0;
				$.each(_self.messages, function(index){
					var obj = this[this.length - 1];
					
					if (obj && obj.fromUserName !== null && obj.toStatus === 0) {
						newMessCount++;
					}
				});
				
				if (newMessCount > 0) {
					$('#messCount').text(newMessCount);
					$('#messCount').removeClass('display');
				} else {
					$('#messCount').addClass('display');
				}
			});

			for (var i = 0; i < meetingTimers.length; i++) {
				clearTimeout(meetingTimers[i]);
			}
			$.ajax({
				url : hostUrl.concat("/meetings?access_token=" + window.bearerToken),
				type : 'GET'
			}).done(function (meeting) {
				_self.meetings = meeting;
				_self.meetings.sort(function (a, b) {
					return parseInt(a.status) - parseInt(b.status)
				});
				for (var i = 0; i < _self.meetings.length; i++) {
					var obj = _self.meetings[i];
					if (obj.fromUserName !== null && obj.status === 0) {
						newMeetCount++;
					}
					var date = new Date(),
					milliSec = Math.round(date.getTime() / 1000);

					if (obj.status === 1 && obj.datetime >= milliSec) {
						var diff = (obj.datetime - milliSec) * 1000;
						meetingTimers[i] = setTimeout(function (data) {
								if (data.fromUserName !== null) {
									alert("You have a meeting now with " + data.fromUserName + " at " + obj.venue);
								} else if (data.toUserName !== null) {
									alert("You have a meeting now with " + data.toUserName + " at " + obj.venue);
								}
							}, diff, obj);
					}
				}
				if (newMeetCount > 0) {
					$('#meetCount').text(newMeetCount);
					$('#meetCount').removeClass('display');
				} else {
					$('#meetCount').addClass('display');
				}
			});
		},
		
		parseMessages: function(message){
			var arrMess = {};
			for(var i=0; i < message.length; i++){
				if(message[i].topicId === -1){
					arrMess[message[i].id] = [];
					arrMess[message[i].id].push(message[i]);
				} else {
					arrMess[message[i].topicId].push(message[i]);
				}
			}
			return arrMess;
		},
		
		feedback : function () {
			var that = this;
			this.$feedbackpage = $("#page-feedback");

			$('#btnSendFeedback', this.$feedbackpage).off('click');
			$('#btnSendFeedback', this.$feedbackpage).on('click', function (e) {
				_self.loading("show");
				var subject = $('#txtFeedbackSubject').val(),
				message = $('#taFeedbackMessage').val();
				$.ajax({
					url : hostUrl.concat("/feedback?access_token=" + window.bearerToken),
					type : 'POST',
					data : {
						'subject' : subject,
						'message' : message
					}
				}).done(function () {
					_self.loading("hide");
					alert("Feedback sent successfully.");
				}).fail(function () {
					_self.loading("hide");
					alert("Feedback could not be send.");
				});
				e.preventDefault();
			});
		},

		editView : function () {
			this.$editpage = $("#page-edit");
			var that = this;
			$('#btnCancel', this.$editpage).off('click');
			$('#btnCancel', this.$editpage).on('click', function () {
				$.mobile.navigate('#page-home');
			});
			
			function geocodeCallback(address){
				$("#city", this.$editpage).val(address);
			}
			
			map.geocodeLatLong(_self._latlng, geocodeCallback);
			
			$.ajax({
				url : hostUrl.concat("/resources/fetch?access_token=" + window.bearerToken),
				type : 'GET'
			}).done(function (user) {
				this.$editpage = $("#page-edit");
				
				$("#username", this.$editpage).val(user.username);
				$("#name", this.$editpage).val(user.name);
				$("#skills", this.$editpage).val(user.skills);
				$("#email", this.$editpage).val(user.email);
				$("#contact", this.$editpage).val(user.contact);

				if (user.visible === 1) {
					$("#editVisible", this.$editpage)[0].checked = 1;
					$("#editVisible", this.$editpage)[0].value = 1;
				} else {
					$("#editVisible", this.$editpage)[0].checked = 0;
					$("#editVisible", this.$editpage)[0].value = 0;
				}

				$('#editVisible').off('change');
				$('#editVisible').on('change', function () {
					var bol = $("#editVisible").is(":checked") ? 1 : 0;
					$('#editVisible').val(bol);
				});

				that.editPic = null;

				$.ajax({
					url : hostUrl + "/profilePic/" + user.username,
					type : 'GET'
				}).done(function (dataURL) {
					$('#imgEditDisp', this.$editpage).attr('src', 'data:image/png;base64,' + dataURL);
					that.editPic = dataURL;
				});

				$('#btnEditImgUpload', this.$editpage).off('click');
				$('#btnEditImgUpload', this.$editpage).on('click', function (event) {
					navigator.camera.getPicture(onCapturePhotoSuccess, onCapturePhotoError, {
						destinationType : navigator.camera.DestinationType.FILE_URI,
						sourceType : navigator.camera.PictureSourceType.PHOTOLIBRARY
					});

					function onCapturePhotoSuccess(imageData) {
						window.resolveLocalFileSystemURI(imageData, gotFileEntry, failSystem);
					}

					function gotFileEntry(fileEntry) {
						//convert all file to base64 formats
						fileEntry.file(function (file) {
							alert(file.size);
							var reader = new FileReader();
							reader.onloadend = function (evt) {
								$('#imgEditDisp').attr('src', evt.target.result);

								that.editPic = _self.dataURItoBlob(evt.target.result);
							};
							reader.readAsDataURL(file);
						}, function (message) {
							alert('Failed because: ' + message);
						});
					}

					function failSystem() {
						alert('failed');
					}

					function onCapturePhotoError(message) {
						alert('Captured Failed because: ' + message);
					}

					event.preventDefault();
				});

				$('#form-edit').off("submit");
				$('#form-edit').submit(function (e) {
					_self.loading("show");
					var formData = new FormData($("#form-edit")[0]);
					if (that.editPic !== null) {
						formData.append('profilePic', that.editPic);
					}

					$.ajax({
						url : hostUrl.concat("/resources/update?access_token=" + window.bearerToken),
						type : 'POST',
						data : formData,
						processData : false,
						contentType : false
					}).done(function (o) {
						_self.loading("hide");
						$.mobile.navigate('#page-home');
					}).fail(function () {
						_self.loading("hide");
					});
					e.preventDefault();
				});
			});
		},

		drawCaptcha : function () {
			var a = Math.floor(Math.random() * 10) + '';
			var b = Math.floor(Math.random() * 10) + '';
			var c = Math.floor(Math.random() * 10) + '';
			var d = Math.floor(Math.random() * 10) + '';
			var e = Math.floor(Math.random() * 10) + '';
			var f = Math.floor(Math.random() * 10) + '';

			var code = a + ' ' + b + ' ' + ' ' + c + ' ' + d + ' ' + e + ' ' + f;
			document.getElementById("txtCaptcha").value = code;
		},

		validateCaptcha : function () {
			function removeSpaces(string) {
				return string.split(' ').join('');
			};
			var str1 = removeSpaces(document.getElementById('txtCaptcha').value);
			var str2 = removeSpaces(document.getElementById('captcha').value);
			if (str1 == str2)
				return true;
		},

		dataURItoBlob : function (dataURI) {
			var byteString = atob(dataURI.split(',')[1]);

			var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

			var ab = new ArrayBuffer(byteString.length);
			var ia = new Uint8Array(ab);
			for (var i = 0; i < byteString.length; i++) {
				ia[i] = byteString.charCodeAt(i);
			}

			var bb = new Blob([ab], {
					"type" : mimeString
				});
			return bb;
		}
	};

	controller.initialize();
	return controller;
};
