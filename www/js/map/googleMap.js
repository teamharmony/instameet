var map = {
	_map: null, _selfMap: null, _markersArray: [],
	init: function(successCallback, errorCallback, markerClickHandler){
		_selfMap = this;
		_map = null;
		if(!!document.getElementById("mapScript")){
			document.body.removeChild(document.getElementById("mapScript"));
		}
		$('#map-canvas').empty();
		var script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCJehKn3JAo02kj6fGFqJMDWkwbnAoBqVM&callback=map.load&libraries=geometry',
		script.id = 'mapScript';
		document.body.appendChild(script);
		
		_selfMap.markerClickHandler = markerClickHandler;
		_selfMap.errorCallback = errorCallback;
		_selfMap.successCallback = successCallback;
	},
	
	load: function() {
		console.log('Map loaded successfull');
		
		navigator.geolocation.getCurrentPosition(this.onSuccess, this.onError );//{timeout: 10000});
	},
	onError: function(error){
		if(error.code === 1){
			var mapOptions = {
				zoom: 2,
				center: new google.maps.LatLng(0, 0)
			};
			
			_map = new google.maps.Map(document.getElementById('map-canvas'),
			  mapOptions);
		}
		_selfMap.errorCallback();
		
	},
	onSuccess: function(position){
		var lat = position.coords.latitude,
			lng = position.coords.longitude;
		
		var latlong = new google.maps.LatLng(lat,lng);
		
		var mapOptions = {
			zoom: 3,
			center: latlong
		};
				
		_map = new google.maps.Map(document.getElementById('map-canvas'),
		  mapOptions);
		
		_selfMap.successCallback(lat,lng);
	},
	
	showOnMap: function(users, userLoggedIn, markerClickCallback){
		_selfMap.clearMarkers();
		var bounds = new google.maps.LatLngBounds();
		var infowindow = new google.maps.InfoWindow();
		
		for (var i in users)
		{
			if(users[i].username != userLoggedIn){
				var obj = users[i];
				var latlng = new google.maps.LatLng(obj.latitude, obj.longitude);
				bounds.extend(latlng);
				 
				var marker = new google.maps.Marker({
					position: latlng,
					map: _map,
					data: obj
				});
				
				_selfMap._markersArray.push(marker);
			 
				google.maps.event.addListener(marker, 'click', jQuery.proxy(function() {
					_selfMap.markerClickHandler(this);
					//infowindow.setContent(_selfMap.infoWindowContent(this.data));
					//infowindow.open(_map, this);				
				}, obj));
			}
		}
		_map.fitBounds(bounds);
	},
	
	clearMarkers: function(){
		for (var i = 0; i < _selfMap._markersArray.length; i++) {
			_selfMap._markersArray[i].setMap(null);
		}
		_selfMap._markersArray = [];
	},
	
	infoWindowContent: function(data){
		var imgUrl = "http://resourcemgmt.cfapps.io/profilePic/"+ data.username;
		var content = '<div id="iw-container">' +
						'<div class="iw-title">'+ data.name +'</div>' +
							'<div class="iw-content">' +
								'<img src="'+imgUrl+'" height="75" width="75">' +
								'<p>Skills : '+ data.skills +'</p>' +
								
							'</div>' +
						'<div class="iw-bottom-gradient"></div>' +
					'</div>';
		return content;
	},
	
	getLatlongAddress: function(address, onGeoSuccess){
		var geocoder = new google.maps.Geocoder();
		geocoder.geocode( { 'address': address}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				//alert(results[0].geometry.location.lat() + ":" + results[0].geometry.location.lng());
				onGeoSuccess(results[0].geometry.location.lat(), results[0].geometry.location.lng());
			} else {
				console.log('Geocode was not successful for the following reason: ' + status);
			}
		});
	},
	
	getLatLongRange: function(lat,lng){	
		var lat1 = lat - 1,
			lat2 = lat + 1,
			long1 = lng - 1,
			long2 = lng +1;
			
		return {"latitude1": lat1, "latitude2": lat2, "longitude1":long1, "longitude2": long2};
	},
	
	getLatLng: function(lat, lng){
		return new google.maps.LatLng(lat,lng);
	},
	
	getDistanceFromLatLng: function(p1, p2){
		return (google.maps.geometry.spherical.computeDistanceBetween(p1, p2) * 0.000621371).toFixed();
	},
	
	geocodeLatLong: function(latlng, callback){
		var geocoder = new google.maps.Geocoder();
		var temp = {lat: parseFloat(latlng.latitude), lng: parseFloat(latlng.longitude)};
		geocoder.geocode( { 'location': temp}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				if(results[3])
				callback(results[3].formatted_address);
			} else {
				console.log('Geocode was not successful for the following reason: ' + status);
			}
		});
	}
	
};