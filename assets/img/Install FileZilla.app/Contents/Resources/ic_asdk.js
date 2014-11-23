var AppreciateSDK_config = {};

function RunWhenReady(f){/in/.test(document.readyState)?setTimeout('RunWhenReady('+f+')',9):f()}
function getQueryVariable( variable )
{
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++)
    {
        var pair = vars[i].split("=");
        if (pair[0] == variable)
        {
            return pair[1];
        }
    }
    return null;
}

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

function OnClickedShow_LINK1()
{
    AppreciateSDK( "openurl", { url: AppreciateSDK_config.links.link1 } );
    return false;
}

function OnClickedShow_LINK2()
{
    AppreciateSDK( "openurl", { url: AppreciateSDK_config.links.link2 } );
    return false;
}

RunWhenReady(function() {
    AppreciateSDK_config = JSON.parse(decodeURIComponent(getQueryVariable("config")));
    var baseUrl = "";   //for images
    if( AppreciateSDK_config.img_base_url && AppreciateSDK_config.img_base_url.length ) {
        baseUrl = AppreciateSDK_config.img_base_url;
    }
    for (var cfgitem in AppreciateSDK_config) {
        if (cfgitem == "controls") {
            var ctls = AppreciateSDK_config[cfgitem];
            for (var type in ctls) {
                if (type == "text") {
                    for (var ii in ctls[type]) {
                        var ci = ctls[type][ii];
                        //the control object
                        var e = document.getElementById(ci.id);
                        if (e) {
                            if( ci.color ) e.style.color = ci.color;
                            if( ci.font_size ) e.style["font-size"] = ci.font_size+"px";
                            if( ci.line_height ) e.style["line-height"] = ci.line_height+"px";
                            var t = ci.text;
                            e.innerHTML = t .replace(/&/g, '&amp;')
                                            .replace(/</g, '&lt;')
                                            .replace(/>/g, '&gt;')
                                            .replace(/\n/g, '<br/>')
                                            .replace(/#_IC_A_LINK1_S_#/g, '<a href="#" onclick="OnClickedShow_LINK1();">')
                                            .replace(/#_IC_A_LINK2_S_#/g, '<a href="#" onclick="OnClickedShow_LINK2();">')
                                            .replace(/#_IC_A_E_#/g, '</a>');
                        } //else no control named like this :|
                    }
                }
                else if (type == "image") {
                    for (var ii in ctls[type]) {
                        var ci = ctls[type][ii];
                        //the control object
                        var e = document.getElementById(ci.id);
                        if (e) {
                            if( ci.width && ci.height ) {
                                e.style.width = ci.width+"px";
                                e.style.height = ci.height+"px";
                            }
                            if( ci.src ) {
                                var fn = ci.src;
                                if( fn.indexOf("://") == -1 ) fn = baseUrl + fn;
                                e.src = fn;
                            }
                            else if( ci["background-image"] ) {
                                var fn = ci["background-image"];
                                if( fn.indexOf("://") == -1 ) fn = baseUrl + fn;
                                e.style["background-image"] = "url("+fn+")";
                            }
                        } //else no control named like this :|
                    }
                } //else unknown control type - do nothing :)
            }
        }
    } //iterate over all relevants keys :)
});