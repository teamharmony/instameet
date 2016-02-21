var Controller = function () {
	var hostUrl = "http://vps.hilfe.website:8080/ResourceMgmt",
	//var hostUrl = "http://localhost:8080/ResourceMgmt",
	clientId = "meetMePal",
	userLoggedIn, watchID;
	//window.localStorage.instameet_loginBy = "normal";

	var controller = {
		_self : null,
		_latlng : null,
		
		initialize : function () {
			_self = this;
			this.bindEvents();
			_self.checkLogin();
			
			openFB.init({
				appId : '1442578949379728',
				tokenStore : window.localStorage
			});

			openGL.init({
				appId : '105396803775-7cu06be67flqbt6j9792ikf8rccb7ant.apps.googleusercontent.com',
				tokenStore : window.localStorage
			});
			
			$(document).delegate("#page-welcome", "pagebeforeshow", function (event, data) {
				_self.welcome();
				/*if (data.prevPage.length === 0) {
					event.preventDefault();
					_self.checkLogin();
				}*/
			});

			$(document).delegate("#page-login", "pagebeforeshow", function () {
				_self.login();
			});

			$(document).delegate("#page-edit", "pagebeforeshow", function () {
				_self.edit();
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
				_self.feedback();
			});			
		},
		
		checkLogin : function () {
			_self.initPushwoosh();
			_self.welcome();
			if (window.localStorage.instameet_loginBy === "normal") {
				if (window.localStorage.instameet_refresh_token) {
					_self.directLoginApp("normal");
				}
			} else if (window.localStorage.instameet_loginBy === "fb") {
				openFB.getLoginStatus(function (response) {
					if (response.status === "connected") {
						_self.directLoginApp("fb");
					} else {
						$.mobile.navigate("#page-welcome");
					}
				});
			} else if (window.localStorage.instameet_loginBy === "gl") {
				openGL.getLoginStatus(function (response) {
					if (response.status === "connected") {
						_self.directLoginApp("gl");
					} else {
						$.mobile.navigate("#page-welcome");
					}
				});
			}
			

			navigator.geolocation.getCurrentPosition(function(success){
				
			}, function(error){
				function okCallback(){
					navigator.app.exitApp();
				};
				_self._showAlert("Please enable your location services to use InstaMeet.", okCallback);
			} );
			
		},
		
		directLoginApp : function (loginBy) {
			function loginSuccess() {
				$.mobile.navigate('#page-home');
				userLoggedIn = window.localStorage.userLogIn;
				window.localStorage.instameet_loginBy = loginBy;
				_self.pushNotification.setTags({"instaUsername":userLoggedIn},
					function(status) {
						console.warn('setTags success');
						_self.pushNotification.registerDevice(
							function(status) {
								var pushToken = status;
								console.warn('push token: ' + pushToken);
								
							},
							function(status) {
								console.warn(JSON.stringify(['failed to register ', status]));
							}
						);
					},
					function(status) {
						console.warn('setTags failed');
					}
				);
				_self.updateLocation();
			};

			function refreshTokenFailure() {
				_self.loading(false);
				$.mobile.navigate("#page-welcome");
			};

			function passwordFailure() {
				_self.loading(false);
				$.mobile.navigate("#page-welcome");
			};

			var authentication = new AuthenticationProxy(hostUrl, clientId, loginSuccess, refreshTokenFailure, passwordFailure);
			authentication.loginWithRefreshToken(window.localStorage.instameet_refresh_token);
		},
		
		bindEvents : function () {
			document.addEventListener("backbutton", _self.backButtonHandler, false);
		},
				
		backButtonHandler : function (event) {
			if($.mobile.activePage.is('#page-welcome')){
				navigator.app.exitApp();
			} else if($.mobile.activePage.is('#page-home')){
				_self.onLogoutClickHandler();
			} else {
				navigator.app.backHistory();
			}
		},
		
		onLogoutClickHandler : function () {
			function onConfirm(button){
				if(button === 1){	
					_self.loading('show');
					$.ajax({
						url : hostUrl.concat("/logout?access_token=" + window.bearerToken),
						type : 'GET'
					}).done(function () {
						if (window.localStorage.instameet_loginBy === "fb") {
							openFB.logout(function () {
								_self.clearAll();
								$.mobile.navigate('#page-welcome');
							});
						}if (window.localStorage.instameet_loginBy === "fb") {
							openGL.logout(function () {
								_self.clearAll();
								$.mobile.navigate('#page-welcome');
							});
						} else {
							_self.clearAll();
							$.mobile.navigate('#page-welcome');
						}
					});
				}
			};
			
			navigator.notification.confirm(
				'Are you sure you want to logout?',  // message
				onConfirm,              // callback to invoke with index of button pressed
				'Logout',            // title
				['Yes','No']          // buttonLabels
			);
		},
		
		clearAll: function(){
			_self.loading('hide');
			window.localStorage.removeItem('instameet_refresh_token');
			window.localStorage.removeItem('instameet_loginBy');
			window.localStorage.removeItem('fbtoken');
			window.localStorage.removeItem('gltoken');
			
			_self.pushNotification.setTags({"instaUsername":null},
				function(status) {
					console.warn('setTags success');
					_self.pushNotification.unregisterDevice(
						function(status) {
							var pushToken = status;
							console.warn('push token: ' + pushToken);
							
						},
						function(status) {
							console.warn(JSON.stringify(['failed to register ', status]));
						}
					);
				},
				function(status) {
					console.warn('setTags failed');
				}
			);
		},
		
		welcome : function () {
			$('#btn-fb').off('click');
			$('#btn-fb').on('click', function (evt) {
				_self.loading('show');
				openFB.getLoginStatus(function (response) {
					if (response.status === "connected") {
						_self.getSocialData('fb');
					} else {
						openFB.login(function (response) {
							if (response.status === 'connected') {
								_self.getSocialData('fb');
							} else {
								_self._showAlert('Facebook login failed: ' + response.error);
							}
						},{ scope : 'email,read_stream' });
					}
				});
				evt.preventDefault();
			});

			$('#btn-gl').off('click');
			$('#btn-gl').on('click', function(evt) {
				_self.loading('show');
				openGL.getLoginStatus(function(response) {
					if (response.status === "connected") {
						_self.getSocialData('gl');
					} else {
						openGL.login(function(response) {
							if (response.status === 'connected') {
								_self.getSocialData('gl');
							} else {
								_self._showAlert('Google login failed: ' + response.error);
							}
						}, {scope: 'openid profile email'});
					}
				});
				evt.preventDefault();
			});
		},
		
		getSocialData : function (social) {
			if(social === 'fb'){
				openFB.api({
					path: '/me',
					params:{'fields':'name,email,picture'},
					success: function (data) {
						_self._checkIfSocialUserExist(data,'fb');
					},
					error: function (error) {
						console.log(error.message);
					}
				});
			} else if(social === 'gl'){
				openGL.api({
					path: '/userinfo',
					success: function (data) {
						_self._checkIfSocialUserExist(data,'gl');
					},
					error: function (error) {
						_self._showAlert(error.message);
					}
				});
			}
		},
		
		_checkIfSocialUserExist: function(data, social){
			var that = this;
			this.data = data;
			this.social = social;
			
			$.ajax({
				url : hostUrl + "/validate/username",
				type : 'POST',
				data : "username=" + social + '_' + data.email,
				processData : false,
				contentType : "application/x-www-form-urlencoded"
			}).done(function (data) {
				if (data === 1) {
					_self.processSocialLogin(that.data, that.social);
				} else {
					_self.registerSocialUser(that.data, that.social);
				}
			});
		},
		
		processSocialLogin: function(data, social){
			var that = this;
			this.data = data;
			this.social = social;
			function loginSuccess() {
				_self.pushNotification.setTags({"instaUsername":userLoggedIn},
					function(status) {
						console.warn('setTags success');
						_self.pushNotification.registerDevice(
							function(status) {
								var pushToken = status;
								console.warn('push token: ' + pushToken);
								
							},
							function(status) {
								console.warn(JSON.stringify(['failed to register ', status]));
							}
						);
					},
					function(status) {
						console.warn('setTags failed');
					}
				);
				_self.loading('hide');
				$.mobile.navigate("#page-home");
				window.localStorage.userLogIn = userLoggedIn = that.social+'_'+that.data.email;
				window.localStorage.instameet_loginBy = that.social;
				_self.updateLocation();
			};

			function refreshTokenFailure() {
				_self.loading("hide");
				$.mobile.navigate("#page-login");
			};

			function passwordFailure() {
				_self.loading("hide");
			};

			var authentication = new AuthenticationProxy(hostUrl, clientId, loginSuccess, refreshTokenFailure, passwordFailure);
			if(this.social === 'fb'){
				authentication.loginWithPassword('fb_'+data.email, 'fbUser');
			} else if(this.social === 'gl'){
				authentication.loginWithPassword('gl_'+data.email, 'glUser');
			}
			
		},
		
		registerSocialUser: function(data, social){
			var that = this, formData = new FormData();
			this.data = data;
			this.social = social;
			this.profilePic = null;
			$.ajax({
				url: "https://graph.facebook.com/"+data.id+"/picture?redirect=false",
				params:{'type':'normal'},
				type: 'GET'
			}).done(function(data){
				var image = new Image();
				image.setAttribute('crossOrigin', 'anonymous');
				image.onload = function () {
					var canvas = document.createElement('canvas');
					canvas.width = this.naturalWidth; // or 'width' if you want a special/scaled size
					canvas.height = this.naturalHeight; // or 'height' if you want a special/scaled size

					canvas.getContext('2d').drawImage(this, 0, 0);
					that.profilePic = canvas.toDataURL('image/png');
					
					if(that.data.email){
						formData.append('name', that.data.name);
						formData.append('email', that.data.email+'_'+new Date().getTime());
						if(that.social === 'fb'){
							formData.append('username', 'fb_'+that.data.email);
							formData.append('password','fbUser');
						} else if(that.social === 'gl'){
							formData.append('username', 'gl_'+that.data.email);
							formData.append('password','glUser');
						}
						formData.append('skills', '');
						formData.append('contact', '');
						formData.append('visible', '1');
						if(that.profilePic !== null){
							formData.append('profilePic', _self.dataURItoBlob(that.profilePic));
						}
						
						$.ajax({
							url : hostUrl + "/resources",
							type : 'POST',
							data : formData,
							processData : false,
							contentType : false
						}).done(function (data) {
							_self.processSocialLogin(that.data, that.social);
						}).fail(function (jqXHR, textStatus, errorThrown) {
							_self.loading("hide");
						});
					} else {
						_self._showAlert('App is not able to fetch your details. Please check your account settings.');
					}
					
				};

				image.src = data.data.url;
			});
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
				window.localStorage.userLogIn = userLoggedIn = userId;
				function loginSuccess() {
					_self.isResetPassRequired();
					window.localStorage.instameet_loginBy = "normal";
					_self.pushNotification.setTags({"instaUsername":userLoggedIn},
						function(status) {
							console.warn('setTags success');
							_self.pushNotification.registerDevice(
								function(status) {
									var pushToken = status;
									console.warn('push token: ' + pushToken);
									
								},
								function(status) {
									console.warn(JSON.stringify(['failed to register ', status]));
								}
							);
						},
						function(status) {
							console.warn('setTags failed');
						}
					);
					_self.updateLocation();
				};

				function refreshTokenFailure() {
					_self.loading('hide');
					$.mobile.navigate("#page-login");
				};

				function passwordFailure() {
					_self.loading('hide');
					_self._showAlert('Invalid Username and Password');
				};

				var authentication = new AuthenticationProxy(hostUrl, clientId, loginSuccess, refreshTokenFailure, passwordFailure);
				authentication.loginWithPassword(userId, pass);
			});
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
					_self._showAlert("Temporary Password can not be empty.");
				} else if (pass !== confirmPass) {
					_self._showAlert("Password and Confirm Password needs to be same.");
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
		
		onLocationError : function (error) {
			console.log('code: ' + error.code + '\n' + 'message: ' + error.message + '\n');
		},

		updateLocation : function () {
			if (watchID != null) {
				navigator.geolocation.clearWatch(watchID);
				watchID = null;
			}
			
			var options = {enableHighAccuracy: true, timeout: 5000, maximumAge: 0, desiredAccuracy: 0, frequency: 1 };
			
			watchID = navigator.geolocation.watchPosition(function (position) {
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
				}).fail(function(){
					console.log("Location Error.");
				});
			}, _self.onLocationError, options);

		},

		homeview : function () {
			var that = this;
			this.$homePage = $('#page-home');
			$('#btnSearch').off('click', _self.onSearchClick);
			$('#btnSearch').on('click', _self.onSearchClick);

			$('#btnLogout').off('click', _self.onLogoutClickHandler);
			$('#btnLogout').on('click', _self.onLogoutClickHandler);

			$('#btnEditProfile').off('click');
			$('#btnEditProfile').on('click', function (e) {
				$.mobile.navigate('#page-edit');
			});
			
			$.ajax({
				url : hostUrl.concat("/resources/fetch?access_token=" + window.bearerToken),
				type : 'GET',
			}).done(function (data, textStatus, jqXHR) {
				$('#title', that.$homePage).text('Welcome ' + data.name + ' !!');
			});
			
			_self.loading("show");
			map.init(_self.onMapSuccess, _self.onMapError, _self.markerClickHandler);
		},
		
		markerClickHandler: function(data){
			_self.showProfile(data);
		},
		
		onMapError: function(error){
			//_self.onLocationError(error);
			_self.loading("hide");
			//_self._showAlert("Please enable your location services to use InstaMeet.");
			//navigator.app.exitApp();
		},
		
		onMapSuccess : function (lat, lng) {
			_self._latlng = {
				"latitude" : lat,
				"longitude" : lng
			};
			
			var obj = map.getLatLongRange(_self._latlng.latitude, _self._latlng.longitude);
			$.ajax({
				url : hostUrl.concat("/search/location"),
				type : 'GET',
				data : obj
			}).done(function (user) {
				if (user.length > 0) {
					map.showOnMap(user, userLoggedIn);
					_self.renderListView(user);
				}
				_self.loading("hide");
			});
				
			/*$.ajax({
				url : hostUrl.concat("/resources/updateLocation?access_token=" + window.bearerToken),
				type : 'PUT',
				data : _self._latlng
			}).done(function (data, textStatus, jqXHR) {
				updateCallback();
				//console.log("location updated successfully.");
			});
			
			function updateCallback(){
				
			}*/
			

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
					map.showOnMap(user, userLoggedIn);
					_self.renderListView(user);
				} else {
					_self._showAlert("No result found for current search criteria.");
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
					map.showOnMap(user, userLoggedIn);
					_self.renderListView(user);
				} else {
					_self._showAlert("No result found for current search criteria.");
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
						map.showOnMap(user, userLoggedIn);
						_self.renderListView(user);
					} else {
						_self._showAlert("No result found for current search criteria.");
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
			for (var i=0; i < data.length; i++) {
				var obj = data[i];
				if (obj.username !== userLoggedIn) {
					var p1 = map.getLatLng(obj.latitude, obj.longitude);
					var p2 = map.getLatLng(_self._latlng.latitude, _self._latlng.longitude);
					var uDist = map.getDistanceFromLatLng(p1, p2);

					$list.append("<li class='listItem' id='lstItem-" + i + "'><div class='ltProfilePicDiv'><img class='ltProfilePic' src='img/defaultImg.png'/></div><div class='ltInfoDiv'><h1 class='list-name'>" + obj.name + "</h1><p class='list-skill'>" + obj.skills + " </p><p class='list-miles'>" + uDist + " miles away!</p></div></li>");

					$listItem = $('#lstItem-' + i);
					$listItem.data('user', obj);
					$.ajax({
						url : hostUrl + "/profilePic/" + obj.username,
						type : 'GET',
						context : $listItem,
						async : true,
						contentType : "image/png"
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
				this.user = $('#'+obj.id).data('user');
				$.each(userInfo, function (index, value) {
					if (value.username === that.user.username) {
						uInfo = value;
						return false;
					}
				});

				_self.showProfile(uInfo);
			}
		},

		profile : function () {
			
		},

		showProfile : function (uInfo) {
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
			$('#txtUDistance').text(uDist + " miles away!");

			this.$profilePage = $("#page-profile");
			this.$uName = $('#txtUName', this.$profilePage);

			$('#txtTo').val(uInfo.username);
			$('#txtToName').val(uInfo.name);
			$('#txtToName').attr("disabled", "disabled");

			$('#txtToMeeting').val(uInfo.username);
			$('#txtToNameMeeting').val(uInfo.name);
			$('#txtToNameMeeting').attr("disabled", "disabled");
			$.mobile.navigate('#page-profile');
		},

		meeting : function () {
			var that = this;
			this.$meetings = $('#page-meetings');
			this.$toMeeting = $('#txtToMeeting', this.$meetings);
			this.$toNameMeeting = $('#txtToNameMeeting', this.$meetings);
			this.$agendaMeeting = $('#txtAgendaMeeting', this.$meetings).val("");
			this.$datetimeMeeting = $('#txtDatetimeMeeting', this.$meetings).val("");
			this.$venueMeeting = $('#txtVenueMeeting', this.$meetings).val("");
			this.$descMeeting = $('#taDescMeeting', this.$meetings).val("");
			
			this.$errorDT = $('#errorDT', this.$meetings)
			
			this.$btnSendMeetingReq = $('#btnSendMeetingReq', this.$meetings);
			
			/*this.$datetimeMeeting.off('focusout');
			this.$datetimeMeeting.on('focusout', function(event){
				var val = event.currentTarget.value.replace("T", " ").replace("Z", ""),
				enterDate = new Date(val).getTime()
				now = new Date().getTime();
				that.$datetimeMeeting.removeClass("invalidInp");
				that.$errorDT.addClass("display");
				if((enterDate - now) < 1800000){
					that.$datetimeMeeting.addClass("invalidInp");
					that.$errorDT.removeClass("display");
				}
			});*/
			
			this.$btnSendMeetingReq.off('click');
			this.$btnSendMeetingReq.on('click', function (e) {
				var dtVal = that.$datetimeMeeting.val().replace("T", " ").replace("Z", "");
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
					//_self.getMessageMeeting();
					_self.loading("hide");
					//alert("Meeting request sent successfully");
					that.$agendaMeeting.val("");
					that.$datetimeMeeting.val("");
					that.$venueMeeting.val("");
					that.$descMeeting.val("");
					$.mobile.navigate("#page-meetingView");
				});
				e.preventDefault();
			});
		},

		meetingView : function () {
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
			
			function meetingSuccess(){
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
							if(obj.status === 0){
								$meetinglist.append("<li id='" + obj.id + "' class='listItem unReadMessage messRecieve" + obj.status + "'><div class='ltProfilePicDiv'><img class='ltProfilePic' src='img/defaultImg.png'/></div><div class='ltInfoDiv'><h1 class='list-name'>" + obj.name + "</h1><p class='list-agenda'>" + obj.agenda + " </p></div><div class='recieveIcon'><span aria-hidden='true' class='glyphicon glyphicon-arrow-down'></span></div></li>");
							} else {
								$meetinglist.append("<li id='" + obj.id + "' class='listItem messRecieve" + obj.status + "'><div class='ltProfilePicDiv'><img class='ltProfilePic' src='img/defaultImg.png'/></div><div class='ltInfoDiv'><h1 class='list-name'>" + obj.name + "</h1><p class='list-agenda'>" + obj.agenda + " </p></div><div class='recieveIcon'><span aria-hidden='true' class='glyphicon glyphicon-arrow-down'></span></div></li>");
							}
							

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
			}
			_self.getMessageMeeting(meetingSuccess);
			
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
					//_self.getMessageMeeting();
					_self.loading("hide");
					//alert("Message sent successfully");
					that.$subject.val("");
					that.$message.val("");
					$.mobile.navigate("#page-messageView");
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
			_self.getMessageMeeting(messageSuccess);
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
				
			function messageSuccess(){			
				/*if(data && data.prevPage.attr('id') === 'page-messages') {
					$('#message-view').css('display', 'block');
					$('#messageListView').css('display', 'none');
				}*/

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
								this.$messageViewListItem.append('<li class="messageSend">'+ messArr[i].message +'</li>');
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
							$('#txtToName').val(messData.name);
							$('#txtToName').attr("disabled", "disabled");
							$('#page-messages').data('replyMessData',messData);
							$.mobile.navigate('#page-messages');
						});

						$('#messageListView').css('display', 'none');
						$('#message-view').css('display', 'block');
					}
				});
				
				$.each(_self.messages, function(index, value){
					var obj =this[this.length - 1];
					if (obj.fromUserName !== null) {
						if (obj.fromStatus !== -1) {
							if(obj.toStatus === 0){
								that.$messagelist.append("<li id='" + obj.id + "' class='listItem unReadMessage messRecieve" + obj.toStatus + "'><div class='ltProfilePicDiv'><img class='ltProfilePic' src='img/defaultImg.png' /></div><div class='ltInfoDiv'><h1 class='list-name'>" + obj.name + "</h1><p class='list-subject'>" + obj.message + " </p></div><div class='recieveIcon'><span aria-hidden='true' class='glyphicon glyphicon-arrow-down'></span></div></li>");
							} else {
								that.$messagelist.append("<li id='" + obj.id + "' class='listItem messRecieve" + obj.toStatus + "'><div class='ltProfilePicDiv'><img class='ltProfilePic' src='img/defaultImg.png' /></div><div class='ltInfoDiv'><h1 class='list-name'>" + obj.name + "</h1><p class='list-subject'>" + obj.message + " </p></div><div class='recieveIcon'><span aria-hidden='true' class='glyphicon glyphicon-arrow-down'></span></div></li>");
							}
							

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
							that.$messagelist.append("<li id='" + obj.id + "' class='listItem messSend' ><div class='ltProfilePicDiv'><img class='ltProfilePic' src='img/defaultImg.png' /></div><div class='ltInfoDiv'><h1 class='list-name'>" + obj.name + "</h1><p class='list-subject'>" + obj.message + " </p></div><div class='sentIcon'><span aria-hidden='true' class='glyphicon glyphicon-arrow-up'></span></div></li>");

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
			}
		},

		getMessageMeeting : function (messageCallback, meetingCallback) {
			var that = this;
			this.meetingCallback = meetingCallback;
			this.messageCallback = messageCallback;
			$.ajax({
				url : hostUrl.concat("/messages?access_token=" + window.bearerToken),
				type : 'GET',
				async : true
			}).done(function (message) {
				_self.messages = _self.parseMessages(message);
				if(that.messageCallback){
					that.messageCallback();
				}
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

			$.ajax({
				url : hostUrl.concat("/meetings?access_token=" + window.bearerToken),
				type : 'GET'
			}).done(function (meeting) {
				_self.meetings = meeting;
				_self.meetings.sort(function (a, b) {
					if(a.status === 0 && (b.status === 1 || b.status === -1)){
						return 0;
					} else if((a.status === 1 || a.status === -1) && b.status === 0 ){
						return 1;
					} else {
						return -1;
					}
					//return parseInt(a.status) - parseInt(b.status);
				});
				
				if(that.meetingCallback){
					that.meetingCallback();
				}
				var newMeetCount = 0, arrSchedule = [];
				_self._cancelMeetingLocalNotification();
				for (var i = 0; i < _self.meetings.length; i++) {
					var obj = _self.meetings[i];
					if (obj.fromUserName !== null && obj.status === 0) {
						newMeetCount++;
					}
					
					var date = new Date(), 
					seconds = Math.round(date.getTime() / 1000);
					if (obj.status === 1 && obj.datetime >= seconds) {						
						if((obj.datetime-3600) >= seconds){
							arrSchedule.push({
								id: obj.id+"-beforeHour",
								title: "InstaMeet",
								text: "You have a meeting in 60 minutes",
								at: new Date((obj.datetime-3600)*1000),
								data: obj
							});
						}
						
						arrSchedule.push({
							id: obj.id,
							title: "InstaMeet",
							text: "You have a meeting now",
							at: new Date(obj.datetime*1000),
							data: obj
						});
					}
				}
				_self._scheduleMeetingLocalNotification(arrSchedule);
				if (newMeetCount > 0) {
					$('#meetCount').text(newMeetCount);
					$('#meetCount').removeClass('display');
				} else {
					$('#meetCount').addClass('display');
				}
			});
		},
		
		_cancelMeetingLocalNotification: function(){
			cordova.plugins.notification.local.cancelAll(function(){
				console.log("All notiication are canceled.");
			});
		},
		
		_scheduleMeetingLocalNotification: function(arrSchedule){
			cordova.plugins.notification.local.schedule(arrSchedule);
			/*cordova.plugins.notification.local.on("trigger",function(notification){
				if(notification.id.search('beforeHour') != -1){
					_self._showAlert("You have a meeting with "+notification.name+" in 60 minutes");
				} else {
					_self._showAlert("You have a meeting with "+notification.name+" now");
				}
			})*/;
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
		
		forgotPassword : function () {
			this.$forgotPass = $('#page-forgot');
			$('#forgot', this.$forgotPass).val("");

			$('#forgotPassForm').off('submit');
			$('#forgotPassForm').submit(function (e) {
				this.$forgotPass = $('#page-forgot');
				var username = $('#forgot', this.$forgotPass).val();

				if (username === "") {
					_self._showAlert("Enter username.");
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
					_self._showAlert("Feedback sent successfully.");
					$('#txtFeedbackSubject').val(''),
					$('#taFeedbackMessage').val('');
				}).fail(function () {
					_self.loading("hide");
					_self._showAlert("Feedback could not be send.");
				});
				e.preventDefault();
			});
		},

		edit : function () {
			this.$editpage = $("#page-edit");
			var that = this;
			$('#btnCancel', this.$editpage).off('click');
			$('#btnCancel', this.$editpage).on('click', function () {
				$.mobile.navigate('#page-home');
			});
			$('#imgEditDisp', this.$edittPage).attr('src', './img/defaultImg.png');
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
						window.resolveLocalFileSystemURL(imageData, gotFileEntry, failSystem);
					}

					function gotFileEntry(fileEntry) {
						//convert all file to base64 formats
						fileEntry.file(function (file) {
							//alert(file.size);
							var reader = new FileReader();
							reader.onloadend = function (evt) {
								$('#imgEditDisp').attr('src', evt.target.result);
								console.log(_self.dataURItoBlob(evt.target.result));
								that.editPic = _self.dataURItoBlob(evt.target.result);
							};
							reader.readAsDataURL(file);
						}, function (message) {
							_self._showAlert('Failed because: ' + message);
						});
					}

					function failSystem() {
						_self._showAlert('failed');
					}

					function onCapturePhotoError(message) {
						_self._showAlert('Captured Failed because: ' + message);
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

		signup : function () {
			_self.drawCaptcha();
			var that = this;
			this.$signUp = $('#page-signup');
			this.$name = $('#name', this.$signUp);
			this.$skills = $('#skills', this.$signUp);
			this.$contact = $('#contact', this.$signUp);
			this.$username = $('#username', this.$signUp);
			this.$email = $('#email', this.$signUp);
			this.$pass = $('#password', this.$signUp);
			this.$confirmPass = $('#confirmPass', this.$signUp);
			this.$txtCaptcha = $('#captcha', this.$signUp);
			this.$btnUpload = $("#btnUpload", this.$signUp);
			this.$imgDisp = $("imgDisp", this.$signUp);
			this.$error = $('#error', this.$signUp);

			this.$name.val("");
			this.$skills.val("");
			this.$contact.val("");
			this.$username.val("");
			this.$email.val("");
			this.$pass.val("");
			this.$confirmPass.val("");
			this.$txtCaptcha.val("");
			this.$imgDisp.attr('src', '');

			$("#registrationscreenpart1").show();
			$("#registrationscreenpart2").hide();
			
			this.$txtCaptcha.off('focusout');
			this.$txtCaptcha.on('focusout', function(){
				_self._setInputState(that.$txtCaptcha, " ", 0, that.$error);
				if(that.$txtCaptcha.val() === ''){
					_self._setInputState(that.$txtCaptcha, "Confirm Password cannot be empty.", 1, that.$error);
				}
			});
			
			this.$confirmPass.off('focusout');
			this.$confirmPass.on('focusout', function(){
				_self._setInputState(that.$confirmPass, " ", 0, that.$error);
				if(that.$confirmPass.val() === ''){
					_self._setInputState(that.$confirmPass, "Confirm Password cannot be empty.", 1, that.$error);
				}
			});
			
			this.$pass.off('focusout');
			this.$pass.on('focusout', function(){
				_self._setInputState(that.$pass, " ", 0, that.$error);
				if(that.$pass.val() === ''){
					_self._setInputState(that.$pass, "Password cannot be empty.", 1, that.$error);
				}
			});
			
			this.$contact.off('focusout');
			this.$contact.on('focusout', function(){
				_self._setInputState(that.$contact, " ", 0, that.$error);
				if(that.$contact.val() === ''){
					_self._setInputState(that.$contact, "Contact cannot be empty.", 1, that.$error);
				}
			});
			
			this.$name.off('focusout');
			this.$name.on('focusout', function(){
				_self._setInputState(that.$name, " ", 0, that.$error);
				if(that.$name.val() === ''){
					_self._setInputState(that.$name, "Name cannot be empty.", 1, that.$error);
				}
			});
			
			this.$skills.off('focusout');
			this.$skills.on('focusout', function(){
				_self._setInputState(that.$skills, " ", 0, that.$error);
				if(that.$skills.val() === ''){
					_self._setInputState(that.$skills, "Skills cannot be empty.", 1, that.$error);
				}
			});
			
			this.$username.off('focusout');
			this.$username.on('focusout', function (e) {
				_self._setInputState(that.$username, " ", 0, that.$error);
				if(that.$username.val() === ''){
					_self._setInputState(that.$username, "Username cannot be empty.", 1, that.$error);
				} else {
					$.ajax({
						url : hostUrl + "/validate/username",
						type : 'POST',
						data : "username=" + that.$username.val(),
						processData : false,
						contentType : "application/x-www-form-urlencoded"
					}).done(function (data) {
						_self._setInputState(that.$username, "Username is already taken.", data, that.$error);
					}).fail(function (jqXHR, textStatus, errorThrown) {
						//alert(jqXHR + ":" + textStatus + ":" + errorThrown);
						//alert(jqXHR.responseText);
					});
				}
				e.preventDefault();
			});

			this.$email.off('focusout');
			this.$email.on('focusout', function (e) {
				_self._setInputState(that.$email, " ", 0, that.$error);
				if(that.$email.val() === ''){
					_self._setInputState(that.$email, "Email cannot be empty.", 1, that.$error);
				} else if (!_self.validateEmail(that.$email.val())) {
					_self._setInputState(that.$email, "Email is invalid.", 1, that.$error);
				} else {
					$.ajax({
						url : hostUrl + "/validate/email",
						type : 'POST',
						data : "email=" + that.$email.val(),
						processData : false,
						contentType : "application/x-www-form-urlencoded"
					}).done(function (data) {
						_self._setInputState(that.$email, "Email is already taken.", data, that.$error);
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
						_self._showAlert('Failed because: ' + message);
					});
				}

				function failSystem() {
					_self._showAlert('failed');
				}

				function onCapturePhotoError(message) {
					_self._showAlert('Captured Failed because: ' + message);
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
					_self._showAlert("Name, skills and contact can not be empty.");
				}
				e.preventDefault();
			});

			$('#btnRegSubmit').off('click');
			$('#btnRegSubmit').on('click', function (e) {
				if (that.$pass.val() !== that.$confirmPass.val()) {
					_self._showAlert("Password and confirm password must match!");
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
						$.mobile.navigate('#page-login');
					}).fail(function (jqXHR, textStatus, errorThrown) {
						_self.loading('hide');
						_self._showAlert("Could not register user. Please contact your administrator.");
						//alert(jqXHR + ":" + textStatus + ":" + errorThrown);
						//alert(jqXHR.responseText);
					});
				} else {
					_self._showAlert("All fields are mandatory.");
				}
				e.preventDefault();
			});
		},
		
		_setInputState: function(control, message, data, errorControl){
			if(data === 1){
				control.addClass('invalidInp');
				errorControl.text(message);
				errorControl.removeClass('display');
			} else {
				control.removeClass('invalidInp');
				errorControl.text("");
				errorControl.addClass('display');
			}
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
		
		validateEmail : function (email) {
			var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
			return re.test(email);
		},
		loading : function (showOrHide) {
			setTimeout(function () {
				$.mobile.loading(showOrHide);
			}, 1);
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
		},
		
		_showAlert: function(message, callback){
			if(callback){
				navigator.notification.alert(message, callback, 'InstaMeet', 'OK')
			} else {
				navigator.notification.alert(message, null, 'InstaMeet', 'OK')
			}
			
		},
		
		_showConfirm: function(message, confirmCallback){
			navigator.notification.confirm(message, confirmCallback, 'InstaMeet', ['Yes','No'])
		},
		
		initPushwoosh: function(){
			//console.log("Inside initPushwoosh");
			var pushNotification = cordova.require("com.pushwoosh.plugins.pushwoosh.PushNotification");
			_self.pushNotification = pushNotification;
			//set push notifications handler
			document.addEventListener('push-notification', function(event) {
				var title = event.notification.title;
				var userData = event.notification.userdata;
										 
				if(typeof(userData) != "undefined") {
					console.warn('user data: ' + JSON.stringify(userData));
				}
											 
				console.log(event.notification);
			});
		 
			//initialize Pushwoosh with projectid: "GOOGLE_PROJECT_NUMBER", pw_appid : "PUSHWOOSH_APP_ID". This will trigger all pending push notifications on start.
			pushNotification.onDeviceReady({ projectid: "105396803775", pw_appid : "EB3A4-8E46D"});
		 
			//register for pushes
			/*pushNotification.registerDevice(
				function(status) {
					var pushToken = status;
					console.warn('push token: ' + pushToken);
				},
				function(status) {
					console.warn(JSON.stringify(['failed to register ', status]));
				}
			);*/
		}
	};

	controller.initialize();
	return controller;
};
