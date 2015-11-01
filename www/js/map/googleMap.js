(function(){
	var script = document.createElement('script');
	script.type = 'text/javascript';
	script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyCJehKn3JAo02kj6fGFqJMDWkwbnAoBqVM&callback=map.load&libraries=geometry';
	document.body.appendChild(script);
})();

var map = {
	_map: null, _thatMap: null, _markersArray: [],
	init: function(successCallback){
		_map = null;
		$('#map-canvas').empty();
		_thatMap = this;
		_thatMap.successCallback = successCallback;
		navigator.geolocation.getCurrentPosition(this.onSuccess, this.onError);
	},
	
	load: function() {
		console.log('Map loaded successfull');
	},
	onError: function(error){
		//alert("Error getting geolocation");
		if(error.code === 1){
			var mapOptions = {
				zoom: 2,
				center: new google.maps.LatLng(0, 0)
			};
			
			_map = new google.maps.Map(document.getElementById('map-canvas'),
			  mapOptions);
		}
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
		
		_thatMap.successCallback(lat,lng);
	},
	
	showOnMap: function(users){
		_thatMap.clearMarkers();
		var bounds = new google.maps.LatLngBounds();
		var infowindow = new google.maps.InfoWindow();
		
		for (var i in users)
		{
			var obj = users[i];
			var latlng = new google.maps.LatLng(obj.latitude, obj.longitude);
			bounds.extend(latlng);
			 
			var marker = new google.maps.Marker({
				position: latlng,
				map: _map,
				data: obj
			});
			
			_thatMap._markersArray.push(marker);
		 
			google.maps.event.addListener(marker, 'click', function() {
				//infowindow.setContent(_thatMap.infoWindowContent(this.data));
				//infowindow.open(_map, this);				
			});
			
			// *
			// START INFOWINDOW CUSTOMIZE.
			// The google.maps.event.addListener() event expects
			// the creation of the infowindow HTML structure 'domready'
			// and before the opening of the infowindow, defined styles are applied.
			// *
			google.maps.event.addListener(infowindow, 'domready', function() {

				// Reference to the DIV that wraps the bottom of infowindow
				var iwOuter = $('.gm-style-iw');

				/* Since this div is in a position prior to .gm-div style-iw.
				 * We use jQuery and create a iwBackground variable,
				 * and took advantage of the existing reference .gm-style-iw for the previous div with .prev().
				*/
				var iwBackground = iwOuter.prev();

				// Removes background shadow DIV
				iwBackground.children(':nth-child(2)').css({'display' : 'none'});

				// Removes white background DIV
				iwBackground.children(':nth-child(4)').css({'display' : 'none'});

				// Moves the infowindow 115px to the right.
				iwOuter.parent().parent().css({left: '115px'});
				
				iwOuter.children(':nth-child(1)').css({'display':'block'});

				// Moves the shadow of the arrow 76px to the left margin.
				iwBackground.children(':nth-child(1)').attr('style', function(i,s){ return s + 'left: 76px !important;'});

				// Moves the arrow 76px to the left margin.
				iwBackground.children(':nth-child(3)').attr('style', function(i,s){ return s + 'left: 76px !important;'});

				// Changes the desired tail shadow color.
				iwBackground.children(':nth-child(3)').find('div').children().css({'box-shadow': 'rgba(72, 181, 233, 0.6) 0px 1px 6px', 'z-index' : '1'});

				// Reference to the div that groups the close button elements.
				var iwCloseBtn = iwOuter.next();

				// Apply the desired effect to the close button
				iwCloseBtn.css({width:'13px', height: '13px', opacity: '1', right: '38px', top: '3px', border: '7px solid #48b5e9', 'border-radius': '13px', 'box-shadow': '0 0 5px #3990B9'});

				// If the content of infowindow not exceed the set maximum height, then the gradient is removed.
				if($('.iw-content').height() < 140){
				  $('.iw-bottom-gradient').css({display: 'none'});
				}

				// The API automatically applies 0.7 opacity to the button after the mouseout event. This function reverses this event to the desired value.
				iwCloseBtn.mouseout(function(){
				  $(this).css({opacity: '1'});
				});
			});
		}

		_map.fitBounds(bounds);
	},
	
	clearMarkers: function(){
		for (var i = 0; i < _thatMap._markersArray.length; i++) {
			_thatMap._markersArray[i].setMap(null);
		}
		_thatMap._markersArray = [];
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