/**
 * Author: Tilman Porschütz
 * 
 * Introduction: This file has all the required methods and parameters to login to instagram, fetch all images
 * of certrain hashtags and display them in a grid. The grid is update every 3 seconds by default.
 * 
 * TODO: Currently the authentification method is getting a time out due to error 429.
 */


// Config Object
let env = (/localhost/g.test(window.location.href)) ? 'dev' : 'prod';
let config = {};
if(env == 'dev'){
    config = {
        clientID: '3d468b4394274f1fbecdf079943d78b5',
        redirectUri: 'http://localhost/redirect.html',
        refreshInterval: 10000,
        tags: 'postsingularity'
    };
} else {
    config = {
        clientID: '3d468b4394274f1fbecdf079943d78b5',
        redirectUri: 'http://instagame.wearepictures.com/redirect.html',
        refreshInterval: 10000,
        tags: 'postsingularity'
    };
}

///////////////////////
// Methods           //
///////////////////////

// Polling the API 
function polling() {
    console.log('Fetching ... ')
    // Empty Container Element before update
    // This is the quick and dirty way
    // If you want smoother transitions, storing the data first and than having a separate 
    // rendering routine handle the display is more appropriate
    setTimeout(function(){
        $.ajax({
            type: "GET", 
            url: "//api.instagram.com/v1/tags/"+config.tags+"/media/recent/?access_token="+accessToken,
            crossDomain: true,
            dataType: "jsonp", //set to JSONP, is a callback
            success: function(response) {
                console.log(response);
                renderView(response.data);
                
            },
            // Connection was lost somehow
            error: function(error){
                console.error(error);
                displayError('Too many request within the hour. This is a known bug, but needs further investigation.');
            },
            complete: function() {
                polling();
            }
        }); 
    },config.refreshInterval);

};

/**
 * Start Live Grid
 * 
 * Starts the polling process which displays tags.
 */
function startLiveGrid() {
    polling();
};

/** 
 * Render View
 * 
 * @param {data} InstagramResponseData
 **/
function renderView(data) {
    $('#instaGrid').html('');
    $.each(data, function(index, obj) {
        console.log(obj.images.standard_resolution.url);
        $('#instaGrid').append('<div class="item"><img src="' + obj.images.standard_resolution.url + '"/></div>');
    })
}

/**
 * Display Error
 * 
 * @param {error} Error
 */
function displayError(error){
    $('body').addClass('has-error');
    $('#errorMessage').html(error);
    setTimeout(function(){
        $('body').removeClass('has-error');
    },3000)
}

/**
 * Instagram Login
 */
function instagramLogin() {
    authenticateInstagram(
        config.clientID,
        config.redirectUri,
        login_callback //optional - a callback function
    );
    return false;
}

/**
 * Authentificate Instagram API with client secret.
 * 
 * This function get the access token which is required to make any endpoint calls,
 * http://instagram.com/developer/endpoints/
 */
var accessToken = null;
var authenticateInstagram = function (instagramClientId, instagramRedirectUri, callback) {
    // Pop-up window size, change if you want
    var popupWidth = 700,
        popupHeight = 500,
        popupLeft = (window.screen.width - popupWidth) / 2,
        popupTop = (window.screen.height - popupHeight) / 2;
    // Url needs to point to instagram_auth.php
    var popup = window.open('instagram_auth.php', '', 'width=' + popupWidth + ',height=' + popupHeight + ',left=' + popupLeft + ',top=' + popupTop + '');
    popup.onload = function () {
        // Open authorize url in pop-up
        if (window.location.hash.length == 0) {
            popup.open('https://instagram.com/oauth/authorize/?client_id=' + instagramClientId + '&redirect_uri=' + instagramRedirectUri + '&response_type=token&scope=public_content', '_self');
        }
        // An interval runs to get the access token from the pop-up
        var interval = setInterval(function () {
            try {
                // Check if hash exists
                if (popup.location.hash.length) {
                    // Hash found, that includes the access token
                    clearInterval(interval);
                    accessToken = popup.location.hash.slice(14); //slice #access_token= from string
                    // Store Token in Session // TODO: Cookie is better perhaps for longlivability
                    sessionStorage.setItem("accessToken",accessToken)
                    popup.close();
                    if (callback != undefined && typeof callback == 'function') {
                        callback();
                    }
                }
            }
            catch (evt) {
                // Permission denied
            }
        }, 100);
    };
};

/**
 * Callback: after succesful login
 */
function login_callback() {
    //alert("You are successfully logged in! Access Token: "+accessToken);

    // This call get user specific data
    $.ajax({
        type: "GET",
        dataType: "jsonp",
        url: "https://api.instagram.com/v1/users/self/?access_token=" + accessToken,
        success: function (response) {
            $('#status').text('Logged in with' + response.data.username + '!');
            // Store user data in sessionStorage
            sessionStorage.setItem("userLoggedIn", "1");
            sessionStorage.setItem("provider", "instagram");
            sessionStorage.setItem("userData", JSON.stringify(response.data));
        },
        error: function (error) {
            console.error(error);
            displayError('Could not login with your credentials.');
        }
    });

    // This calls the images for the grid
    startLiveGrid();
}



/////////////////////////////////////////////////
// This is the actual initialization of the app//
/////////////////////////////////////////////////
$(document).ready(function () {
    console.log("Insta App init", config);

    if (typeof (Storage) !== "undefined") {
        var userLoggedIn = sessionStorage.getItem("userLoggedIn");
        if (userLoggedIn == '1') {
            
            // Get the access Token first for any further actions
            console.log(accessToken, sessionStorage.getItem('accessToken'))
            accessToken = sessionStorage.getItem("accessToken");
            // Get user data from session storage
            var provider = sessionStorage.getItem("provider");
            var userInfo = sessionStorage.getItem("userData");
            var userData = $.parseJSON(userInfo);
            
            // Visually update the login status
            $('body').addClass('user-is-logged-in');
            $('#status').text('Logged in with ' + userData.username + '!');

            // Go
            startLiveGrid();
        }
    } else {
        console.log("Sorry, your browser does not support Web Storage...");
    }
});