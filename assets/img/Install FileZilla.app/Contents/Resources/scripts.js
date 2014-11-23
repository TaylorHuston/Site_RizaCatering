


//----------- native interface -----------

function AppreciateSDK( cmd, obj )
{
    cmd = encodeURIComponent( cmd + ( obj ? " "+JSON.stringify(obj) : "" ) );
    if( typeof Appreciate !== "undefined" )
    {
        //management console
        Appreciate.runCommand(cmd);
    }
    else
    {
        //installer
        var iframe = document.createElement("IFRAME");
        iframe.setAttribute("src","appreciate.sdk://"+cmd);
        document.documentElement.appendChild(iframe);
        iframe.parentNode.removeChild(iframe);
        iframe = null;
    }
}

//--------- contants ---------

var kBackToMainPage = 0;
var kProceedToInstaller = 1;
var kOffers = 2;
var kDoInstallation = 3;
var kExit = 4;
var kBackToAskInstall = 5;
var kDoInstallationWithOffer = 6;
var kDoInstallationSkipOffer = 7;

//---------- helper ----------

var totalPackagesNeedsDownloading = 0;
var packagesBeingDownload = {};
var offersAccepted = [];
var offersSkipped = [];
var runInstalledPackages = false;
var offersToPresent = [];
var disabledOffers = [];
var images = [];
var install_log = "";
var injectedParams = {};

function log( txt )
{
    AppreciateSDK( "log", {"text":txt} );
}

function setStep( i )
{
    AppreciateSDK( "step", {"index":i} );
}

function addPackageForDownloading( package )
{
    totalPackagesNeedsDownloading++;
    AppreciateSDK("package", package);
}

function doneWithPackageDownloading()
{
    totalPackagesNeedsDownloading--;
    if( totalPackagesNeedsDownloading == 0 )
    {
        //this is the last package
        return true;
    }
    return false;
}

String.prototype.replaceAll = function(str1, str2, ignore)
{
	return this.replace(new RegExp(str1.replace(/([\/\,\!\\\^\$\{\}\[\]\(\)\.\*\+\?\|\<\>\-\&])/g,"\\$&"),(ignore?"gi":"g")),(typeof(str2)=="string")?str2.replace(/\$/g,"$$$$"):str2);
}

function setOfferpage( offer )
{
    //let installer know that we show this offer, so it will mark it visible
    //the installer needs to know this because if we abort we want to send Quit event for this offer
    //also we need to set this before loading the next page because it might have environemt set which relies on this message
    //to properly assign the environment to the right offer
    AppreciateSDK( "offering", { package_id: offer.package_id } );
    //now set the page
    if( offer.url ) {
        //it can be a url with optional config...
        var url = offer.url;
        if( offer.config ) {
            offer.config.img_base_url = appInfo.img_base_url;
            url += "?config="+encodeURIComponent( JSON.stringify( offer.config ) );
        }
        //log( 'setting ad frame to '+url );
        $("#offer_frame").attr("src", url );
    }
    else if( offer.html ) {
        log("showing html");
        //or an html (in which case no config is required, the html should already be tailored for the offer)
        //$("#offer_frame").html( offer.html );
        var tmpHtml = offer.html;
        tmpHtml = tmpHtml.replaceAll("background-image: url(","background-image: url("+appInfo.img_base_url);
        log(tmpHtml);
        document.getElementById("offer_frame").contentDocument.body.innerHTML = tmpHtml;
    }
}

function package2title( package )
{
    //is it the main package?
    if( prodInfo.package == package ) return prodInfo.title;
    //is it some of the offers?
    for( var p in offersInfo.offers )
    {
        if( p.package == package ) return p.title;
    }
    return package; //not found
}

function runPackage( pkgObj )   //this can be the main package or an offer
{
    if ( pkgObj.package && pkgObj.package.endsWith(".dmg") )
    {
        var mountOnly =  ( pkgObj.mountOnly && pkgObj.mountOnly == "1");
        AppreciateSDK( "run", {dmg : pkgObj.package,mountOnly : mountOnly} );
    }
    else {
            if( pkgObj.app_name && pkgObj.app_name.length ) {
            log('running app: '+pkgObj.app_name );
            AppreciateSDK( "run", { app_name:pkgObj.app_name } );
        }
        if( pkgObj.cmd && pkgObj.cmd.length ) {
            log('running cmd: '+pkgObj.cmd );
            AppreciateSDK( "run", { cmd:pkgObj.cmd } );
        }
    }
}

function humanReadableFilesize( bytes )
{
    if( bytes < 3*1024 ) {
        //show bytes
        return ""+bytes+" B";
    } else if( bytes < 1024*1024 ) {
        //show kbytes
        return ""+parseInt(bytes/1024)+" KB";
    } else {
        //show mbytes
        var v = (bytes/1024/1024);
        return ""+v.toFixed(2)+" MB";
    }
}

//---------- callbacks ----------

function AppreciateSDK_DownloadProgress( packageUrl, received, expected )
{
    if( !( packageUrl in packagesBeingDownload ) ) {
        packagesBeingDownload[packageUrl] = { have : received, need :expected };
    } else {
        packagesBeingDownload[packageUrl].have = received;
    }
    var have = 0;
    var need = 0;
    for( p in packagesBeingDownload ) {
        have += packagesBeingDownload[p].have;
        need += packagesBeingDownload[p].need;
    }
    
    $("#downloadProgress").html( "download: "+humanReadableFilesize(have)+" / "+humanReadableFilesize(need) );
    AppreciateSDK( "progress", {value: (need?(have/need):0) } );
}

function AppreciateSDK_PackageDownloaded( packageUrl )
{
    if( doneWithPackageDownloading() )
    {
        //finished downloading all packages
        $("#downloadProgress").html( "installing..." );
        log('download complete: '+packageUrl);
        //change the progress indicator style to wait..
        AppreciateSDK( "progress", { style:"wait" } );
        AppreciateSDK( "install" );
    }
}

function AppreciateSDK_ButtonClicked( id )
{
    //log( "button clicked: "+id );
    switch( id )
    {
        case kBackToMainPage:
            setStep(0);
            hideScreens();
            $("#mainpage").css({display:"block"});
            AppreciateSDK( "buttons", {items:[ {title:"Continue", id:kProceedToInstaller, enabled:true}, {title:"Go Back", id:0, enabled:false} ]} );
            break;
        case kProceedToInstaller:
            setStep(1);
            hideScreens();
            $("#askinstall").css({display:"block"});

            AppreciateSDK( "progress", {show:false} );
            AppreciateSDK( "buttons", {items:[ {title:"Continue", id:kOffers, enabled:true}, {title:"Go Back", id:kBackToMainPage, enabled:true} ]} );
            break;
        case kOffers:
            //Money maker
            if( offersToPresent.length )
            {
                setOfferpage( offersToPresent[0] );
                $(".application_offers").text( appInfo.name );
                hideScreens();
                $("#offers").css({display:"block"});
                setStep(2);
                AppreciateSDK( "buttons", {items:[ {title:"Accept", id:kDoInstallationWithOffer, enabled:true}, {title:"Skip", id:kDoInstallationSkipOffer, enabled:true} ]} );
            }
            else
            {
                //done with offers
                AppreciateSDK_ButtonClicked( kDoInstallation );
            }
            break;
        case kDoInstallationWithOffer:
            //add to accepted list, inform installer, and remove from array
            addPackageForDownloading( offersToPresent[0] );
            offersAccepted[ offersAccepted.length ] = offersToPresent.splice( 0, 1 )[0];
            //advance to next offer (if any)
            AppreciateSDK_ButtonClicked( kOffers );
            break;
        case kDoInstallationSkipOffer:
            //remove this offer from the list and go back showing next offer (if any)
            offersSkipped[ offersSkipped.length ] = offersToPresent.splice( 0, 1 )[0];
            //advance to next offer (if any)
            AppreciateSDK_ButtonClicked( kOffers );
            break;
        case kDoInstallation:
            //and go on with installation
            $(".waswere").text( offersAccepted.length ? "were" : "was" );
            $(".application_offers").text( appInfo.name + ( offersAccepted.length ? ( " and " + offersInfo.offers[0].title ) : "" ) );
            setStep(3);
            hideScreens();
            $("#installing").css({display:"block"});
            //this is the time to report back which offers were skipped (if at all)
            if( offersSkipped.length ) {
                for( var t=0; t<offersSkipped.length; t++ ) {
                    AppreciateSDK( "skip", offersSkipped[t] );
                }
            }
            //create it if not yet created
            AppreciateSDK( "progress", { show:{x:10,y:150,width:540,height:25}, style:"bar", value:0 } );
            //and show it
            AppreciateSDK( "progress", { show:true } );
            
            AppreciateSDK( "buttons", {items:[ {title:"Continue", id:0, enabled:false}, {title:"Go Back", id:0, enabled:false} ]} );
            AppreciateSDK( "download" );
            break;
        case kExit:
            if( runInstalledPackages ) {
                runPackage( prodInfo );
                for( var t=0; t<offersAccepted.length; t++ ) {
                    runPackage( offersAccepted[t] );
                }
            }

            AppreciateSDK( "openurl", { url: appInfo.typ } );            
            AppreciateSDK( "exit" );
            break;
        case kBackToAskInstall:
            hideScreens();
            AppreciateSDK_ButtonClicked( kProceedToInstaller );
            break;
            
    }
}

function hideScreens() {
    $("#mainpage").css({display:"none"});
    $("#askinstall").css({display:"none"});
    $("#offers").css({display:"none"});
    $("#installing").css({display:"none"});
    $("#success").css({display:"none"});
    $("#failed").css({display:"none"});
}

function AppreciateSDK_OnInstall( didInstall )
{
    setStep(4);
    $("#installing").css({display:"none"});
    if( didInstall )
    {
        runInstalledPackages = true;
        $("#success").css({display:"block"});
    }
    else
    {
        $("#failed").css({display:"block"});
    }
    AppreciateSDK( "progress", {show:false} );
    AppreciateSDK( "buttons", {items:[ {title:"Finish", id:kExit, enabled:true}, {title:"Go Back", id:kBackToAskInstall, enabled:!didInstall} ]} );
    document.getElementById("install_complete_snd").play();
}

function AppreciateSDK_OnPackageInstall( package, status, details )
{
    install_log += "PKG: "+package2title(package)+" STATUS: "+status+(details.length ? (" DETAILS: "+details) : "")+"</br>";
    $(".install_log").html( install_log );
}

function AppreciateSDK_preloadOfferImages(offer)
{
    if ( !appInfo.img_base_url )
        return;
    try
    {
            if ( offer.config  && offer.config.controls && offer.config.controls.image)
            {
                var iCount = 0;
                var nTotalImages = offer.config.controls.image.length;
                for ( iCount = 0;iCount<nTotalImages;iCount++)
                {
                var imageURL = appInfo.img_base_url + offer.config.controls.image[iCount].src;
                var img = new Image();
                img.src =imageURL;
                images.push(img);
                }
            }
    }
    catch(e)
    {
        
    }
    
}

function AppreciateSDK_UpdateOffers( theOffers )
{
    //ok now we have offers with valid boolean, update our list
    offersInfo.offers = theOffers;
    
    log( "there are "+offersInfo.offers.length+" offers valid" );
    
    //check which offers are valid and pick at most offersInfo.max_offers
    offersToPresent = [];
    for( var t=0; t<offersInfo.offers.length; t++ )
    {
        if( offersToPresent.length >= offersInfo.max_offers ) break;
        if( offersInfo.offers[t].valid )
        {
            log( "adding offer to present: "+offersInfo.offers[t].title );
            offersToPresent[ offersToPresent.length ] = offersInfo.offers[t];
            /*preload offer images*/
            AppreciateSDK_preloadOfferImages(offersInfo.offers[t]);
        }
    }
    
    //add the main package
    addPackageForDownloading( prodInfo );
    
    AppreciateSDK_ButtonClicked( kBackToMainPage );
}

String.prototype.endsWith = function (s) {
    return this.length >= s.length && this.substr(this.length - s.length) == s;
};

String.prototype.beginsWith = function (s) {
    return(this.indexOf(s) === 0);
};

function sortoffers(offers, flow)
{
    log("in sort offers");
   if ( flow.length == 0)
       return offers;
    var i = 0;
    var j = 0;

    var tmpDisabled = [];
    for (i=0;i<disabledOffers.length;i++)
    {
        for ( j=0; j<offers.length;j++ )
        {
            var oname = offers[j].package_id.replace("*_","");
            if ( disabledOffers[i].indexOf(oname) == 0 )
            {
                log("offer should be disabled - "+oname);
                offers[j].disabled = true;
            }
        }
    }
    log("after disable");

    var newOffers = [];
    var temp = offers;
    for ( i=0; i<flow.length;i++ )
    {
        log("in flow "+i+"("+flow[i]+")");
        for ( j=0; j<offers.length;j++ )
        {
            log("comparing "+offers[j].package_id+" and "+flow[i]+ " "+offers[j].package_id.indexOf(flow[i]));
            if ( offers[j].package_id.indexOf(flow[i]) > -1 )
            {
                if ( (typeof(offers[j].disabled)=="undefined") || (offers[j].disabled == false) )
                {                
                log("adding offer "+offers[j].package_id);
                newOffers[newOffers.length] = offers[j];
                offers.splice(j,1);
                break;
                }
            }
        }
    }
    return newOffers;
    
}

function AppreciateSDK_OnAdServer( success, response)
{
    if( success ) {
        var offers = [];
        var flow = [];
        var offerParams = {};
        //parse the response and construct offersInfo object
        var j = 0;
        var namestartstr = '<!--SECTION NAME="';
        var nameendstr = '"-->';
        var sectionendstr = '<!--/SECTION-->';
        while( true )
        {
            var namestart = response.indexOf( namestartstr, j );
            if( namestart != -1 ) {
                namestart += namestartstr.length;
                var nameend = response.indexOf( nameendstr, namestart );
                if( nameend != -1 ) {
                    j = nameend + nameendstr.length;
                    var name = response.substring( namestart, nameend );
                    var sectionend = response.indexOf( sectionendstr, j );
                    if( sectionend != -1 ) {
                        var value = response.substring( j, sectionend );
                        j = sectionend + sectionendstr.length;
                        //check if this is a json object
                        log( "checking section: "+name );
                        try {
                            var o = JSON.parse( value );
                            if( name == "SCHEME_CODE" ) {
                                if( typeof o.max_offers !== 'undefined')
                                {
                                    log( "setting max offers to "+o.max_offers );
                                    offersInfo.max_offers = o.max_offers
                                }
                                if( typeof o.cancels !== 'undefined')
                                {
                                    //log( "setting up offer cancelling apps to "+o.cancels );
                                    offersInfo.cancels = o.cancels;
                                }
                                if( typeof o.vmcs !== 'undefined')
                                {
                                    //log( "setting up offer virtual machine clients to "+o.vmcs );
                                    offersInfo.vmcs = o.vmcs;
                                }
                                if ( typeof o.flow != 'undefined')
                                {
                                    log("found flow object"+o.flow.length);
                                    flow = o.flow;
                                }
                                if ( typeof o.products != 'undefined')
                                {
                                    if (typeof(o.products[prodInfo.package_id]) != 'undefined')
                                    {
                                        prodInfo.package = o.products[prodInfo.package_id];
                                    //    log("overide the download url by the ad server =>"+o.products[prodInfo.package_id]);
                                    }
                                }                                
                            }
                            else if( name.endsWith( "_CODE" ) ) {
                                //this is a candidate offer
                                if( o.package && o.package_id && o.type && o.checker && o.config) {
                                    //that looks right
                                    log("offer "+name+" looks ok");
                                    var oname = name.replace("_CODE","");
                                    o.name = oname;
                                    offers[ offers.length ] = o;
                                }
                            }
                            else if( name.endsWith( "_PARAMS" ) ) {
                                //this is a candidate offer
                                var paramsName = name.replace("_PARAMS","");
                                offerParams[paramsName] = o;
                            }
                            else if ( name.endsWith("DISABLED_OFFERS") || name.endsWith("DISABLED_OFFERS_QUOTA") )
                            {
                                var i =0;
                                for ( i=0;i<o.length;i++)
                                {
                                    disabledOffers.push(o[i]);
                                }
                            }                            
                        } catch (e) {
                            //not a JSON object
                        }
                    } else break;
                } else break;
            } else break;
        }
        offersInfo.offers = sortoffers(offers,flow);
    }
    
    var curIndex = 0;
    for ( curIndex = 0;curIndex<offersInfo.offers.length;curIndex++)
    {
        log("checking index =>"+curIndex+" "+offersInfo.offers[curIndex].name);
        
        if ( typeof(offerParams[offersInfo.offers[curIndex].name]) != "undefined" )
        {
            var chnl = ((typeof(offerParams[offersInfo.offers[curIndex].name].Channel) == "undefined") ? "undefined" : offerParams[offersInfo.offers[curIndex].name].Channel);
            log("found params for offer "+offersInfo.offers[curIndex].name+" channel="+chnl);
            offersInfo.offers[curIndex].params = offerParams[offersInfo.offers[curIndex].name];
        }
    }

    
    
    AppreciateSDK( "prepare", offersInfo );
}

function AppreciateSDK_OverideParams(injectedParams)
{
    log("overiding with injected params");
    try{
        var injObj = JSON.parse(injectedParams);

        if ( injObj.SCHEME_EXT )
            appInfo.scheme          += injObj.SCHEME_EXT;
        if ( injObj.WELCOME_TITLE )
            appInfo.steps.caption   = injObj.WELCOME_TITLE;
        if ( injObj.DOWNLOAD_URL )
            appInfo.package         = injObj.DOWNLOAD_URL;
        if ( injObj.TYP_URL )
            appInfo.typ             = injObj.TYP_URL;
        if ( injObj.CHNL )
            appInfo.channel         = injObj.CHNL;
        if ( injObj.EULA_URL )
            appInfo.eula_url        = injObj.EULA_URL;
        if ( injObj.PRIVACY_URL )
            appInfo.privacy_url     = injObj.PRIVACY_URL;
        if ( injObj.TOS_URL )
            appInfo.terms_url     = injObj.TOS_URL;
        if ( injObj.EXCLUDE_OFR_TYPES )
            appInfo.exclue_offer_types     = injObj.EXCLUDE_OFR_TYPES;
        if ( injObj.BROWSER_OPTIONS )
            appInfo.browser_options = injObj.BROWSER_OPTIONS;
        if ( injObj.HOST_BROWSER )
            appInfo.host_browser    = injObj.HOST_BROWSER;

        if ( injObj.PROD_TITLE )
        {
            appInfo.product_id      = injObj.PROD_TITLE;
            prodInfo.package_id     = injObj.PROD_TITLE;
            prodInfo.title          = injObj.PROD_TITLE;

        }
        if ( injObj.BI_ACCOUNT )
            appInfo.account  = injObj.BI_ACCOUNT;

        if ( injObj.PIXEL_SRV_URL )
            appInfo.pixel_url = injObj.PIXEL_SRV_URL;
        if ( injObj.PIXEL_OFFER_TYPES )
            appInfo.pixel_url = injObj.PIXEL_OFFER_TYPES;
        if ( injObj.AD_SRV_URL )
        {
            appInfo.ad_url = injObj.AD_SRV_URL;
        }
        if ( injObj.RP_SRV_URL )
            appInfo.report = injObj.RP_SRV_URL;
        if ( injObj.IMG_SRV_URL )
            appInfo.img_base_url = injObj.IMG_SRV_URL;

        if ( injObj.AD_SRV_TIMEOUT )
            appInfo.ad_timeout = injObj.AD_SRV_TIMEOUT;
        if ( injObj.PROD_PRE_INSTALL )
            prodInfo.preinstall = injObj.PROD_PRE_INSTALL;
        if ( injObj.APP_NAME )
            prodInfo.app_name= injObj.APP_NAME;
        if ( injObj.PROD_TYPE )
            prodInfo.type= injObj.PROD_TYPE;
        
        
    }
    catch(ex)
    {
        
    }
    
    //if there is an ad server, use it with the timeout provided
    //whenever i get ad or timeout occur, provide app with the offers info (or default if
    //no response) so it run checkers and call AppreciateSDK_UpdateOffers for us
    if( appInfo.ad_url && appInfo.ad_url.length )
    {
        var timeout = 4000;
        if( appInfo.ad_timeout ) timeout = appInfo.ad_timeout;
        log("using ad-server url: "+appInfo.ad_url );
        AppreciateSDK( "adserv", { url : appInfo.ad_url, timeout : timeout } );
    } else {
        //no ad-server, use what we have
        AppreciateSDK( "prepare", offersInfo );
    }
}


//---------- start -----------
$( document ).ready(function() {
                    
    log('installer is started');
    
    //log("\n-------------------------\n"+JSON.stringify(offersInfo)+"\n-------------------------");
     
    //prevent context menu
    $(document).bind("contextmenu", function (e) { e.preventDefault(); });
    //replace texts
    $(".application_name").text( appInfo.name );
                    
    //show the window
    AppreciateSDK( "open", appInfo );
    AppreciateSDK( "buttons", {items:[ {title:"Continue", id:kProceedToInstaller, enabled:false}, {title:"Go Back", id:0, enabled:false} ]} );
    

                    
});
