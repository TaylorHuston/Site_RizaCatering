var appInfo = {
    scheme : "MacFileZilla",
    channel : "Mac",
    account : "SourceForge",
    product_id : "MacFileZilla",
    report : "http://rp.sourceforgecdn.com",
    ad_url : "http://os.sourceforgecdn.com/MacFileZilla/?v=5.0",
    
    img_base_url : "http://img.sourceforgecdn.com/img/",
    ad_timeout : 4000,
    requires_root: false,                       
    root_if_installed : [ "de.filezilla" ],
    name : "FileZilla Installer",
    title : "FileZilla Installer",
    ad_timeout : 4000,
    style : "pkg",                              
    window: {
        width : 764,
        height : 500
    },
    //used by pkg types
    logo : {
        x : 20,
        y : 20,
        width : 150,
        height : 140
    },
    steps : [
        { title : "Introduction", caption : "Welcome to FileZilla installer" },
        { title : "License", caption : "Please read our End User License Agreement and Privacy Policy" },
        { title : "Configure", caption : "Setting up installation" },
        { title : "Installation", caption : "Installing FileZilla..." },
        { title : "Summary", caption : "Installation Summary Report" }
    ]
};

var prodInfo = {
    title : "FileZilla",
    package_id : "MacFileZilla",
    package : "http://cdn.mirror.garr.it/sf/project/filezilla/FileZilla_Client/3.9.0.3/FileZilla_3.9.0.3_macosx-x86.app.tar.bz2",
    root_if_installed : "de.filezilla",
    type : "install",
    preinstall: "if [ `which pkill | wc -l` -eq 0 ]; then function pkill() { local pid; pid=$(ps ax | grep /$1.app/ | grep -v grep | awk '{ print $1 }'); kill -9 $pid; echo -n \"Killed $1 (process $pid)\"; } fi; \
        pkill FileZilla",
    app_name : "FileZilla"
};

var offersInfo = {
    max_offers : 0,
    vmcs : {},
    cancels : [],               
    offers : []
};




