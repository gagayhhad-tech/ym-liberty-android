.class public Lcom/ymliberty/app/AppWebViewClient;
.super Landroid/webkit/WebViewClient;
.source "AppWebViewClient.java"

.method public constructor <init>()V
    .registers 1

    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V

    return-void
.end method

.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Ljava/lang/String;)Z
    .registers 6

    if-eqz p2, :cond_22

    const-string v0, "http://"

    invoke-virtual {p2, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-nez v0, :cond_12

    const-string v0, "https://"

    invoke-virtual {p2, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_22

    :cond_12
    :try_start_0
    new-instance v0, Landroid/content/Intent;

    const-string v1, "android.intent.action.VIEW"

    invoke-static {p2}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v2

    invoke-direct {v0, v1, v2}, Landroid/content/Intent;-><init>(Ljava/lang/String;Landroid/net/Uri;)V

    const/high16 v1, 0x10000000

    invoke-virtual {v0, v1}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;

    invoke-virtual {p1}, Landroid/webkit/WebView;->getContext()Landroid/content/Context;

    move-result-object v1

    invoke-virtual {v1, v0}, Landroid/content/Context;->startActivity(Landroid/content/Intent;)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    const/4 v0, 0x1

    return v0

    :catch_0
    :cond_22
    const/4 v0, 0x0

    return v0
.end method

.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Z
    .registers 4

    if-eqz p2, :cond_f

    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;

    move-result-object v0

    if-eqz v0, :cond_f

    invoke-virtual {v0}, Landroid/net/Uri;->toString()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {p0, p1, v0}, Lcom/ymliberty/app/AppWebViewClient;->shouldOverrideUrlLoading(Landroid/webkit/WebView;Ljava/lang/String;)Z

    move-result v0

    return v0

    :cond_f
    const/4 v0, 0x0

    return v0
.end method

.method public shouldInterceptRequest(Landroid/webkit/WebView;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;
    .registers 13

    if-eqz p2, :cond_offline_none
    const-string v0, "https://offline.local/audio/"
    invoke-virtual {p2, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :cond_offline_cache_route
    const/4 v9, 0x0
    goto :cond_offline_route_ready

    :cond_offline_cache_route
    const-string v0, "https://offline.local/cache/"
    invoke-virtual {p2, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :cond_offline_none
    const/4 v9, 0x1

    :cond_offline_route_ready

    :try_start_offline
    invoke-static {p2}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;
    move-result-object v0
    invoke-virtual {v0}, Landroid/net/Uri;->getLastPathSegment()Ljava/lang/String;
    move-result-object v1
    if-eqz v1, :cond_offline_none
    const-string v0, "/"
    invoke-virtual {v1, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z
    move-result v0
    if-nez v0, :cond_offline_none
    const-string v0, "\\"
    invoke-virtual {v1, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z
    move-result v0
    if-nez v0, :cond_offline_none
    const-string v0, ".."
    invoke-virtual {v1, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z
    move-result v0
    if-nez v0, :cond_offline_none

    invoke-virtual {p1}, Landroid/webkit/WebView;->getContext()Landroid/content/Context;
    move-result-object v0
    if-eqz v9, :cond_offline_public_dir
    invoke-virtual {v0}, Landroid/content/Context;->getCacheDir()Ljava/io/File;
    move-result-object v2
    if-eqz v2, :cond_offline_none
    new-instance v3, Ljava/io/File;
    const-string v4, "ym-downloads"
    invoke-direct {v3, v2, v4}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V
    move-object v2, v3
    goto :cond_offline_dir_ready

    :cond_offline_public_dir
    sget-object v2, Landroid/os/Environment;->DIRECTORY_MUSIC:Ljava/lang/String;
    invoke-virtual {v0, v2}, Landroid/content/Context;->getExternalFilesDir(Ljava/lang/String;)Ljava/io/File;
    move-result-object v2

    :cond_offline_dir_ready
    if-eqz v2, :cond_offline_none
    new-instance v3, Ljava/io/File;
    invoke-direct {v3, v2, v1}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    invoke-virtual {v2}, Ljava/io/File;->getCanonicalPath()Ljava/lang/String;
    move-result-object v4
    sget-object v5, Ljava/io/File;->separator:Ljava/lang/String;
    new-instance v6, Ljava/lang/StringBuilder;
    invoke-direct {v6, v4}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V
    invoke-virtual {v6, v5}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v6}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v4
    invoke-virtual {v3}, Ljava/io/File;->getCanonicalPath()Ljava/lang/String;
    move-result-object v5
    invoke-virtual {v5, v4}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :cond_offline_none
    invoke-virtual {v3}, Ljava/io/File;->isFile()Z
    move-result v0
    if-eqz v0, :cond_offline_none

    const-string v0, ".flac"
    invoke-virtual {v1, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :cond_offline_mp3
    const-string v4, "audio/flac"
    goto :cond_offline_mime_ready
    :cond_offline_mp3
    const-string v0, ".mp3"
    invoke-virtual {v1, v0}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :cond_offline_none
    const-string v4, "audio/mpeg"
    :cond_offline_mime_ready
    new-instance v7, Ljava/io/FileInputStream;
    invoke-direct {v7, v3}, Ljava/io/FileInputStream;-><init>(Ljava/io/File;)V
    new-instance v8, Ljava/util/HashMap;
    invoke-direct {v8}, Ljava/util/HashMap;-><init>()V
    const-string v0, "Access-Control-Allow-Origin"
    const-string v1, "*"
    invoke-interface {v8, v0, v1}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;
    const-string v0, "Content-Length"
    invoke-virtual {v3}, Ljava/io/File;->length()J
    move-result-wide v1
    invoke-static {v1, v2}, Ljava/lang/Long;->toString(J)Ljava/lang/String;
    move-result-object v1
    invoke-interface {v8, v0, v1}, Ljava/util/Map;->put(Ljava/lang/Object;Ljava/lang/Object;)Ljava/lang/Object;
    new-instance v0, Landroid/webkit/WebResourceResponse;
    move-object v1, v4
    const/4 v2, 0x0
    const/16 v3, 0xc8
    const-string v4, "OK"
    move-object v5, v8
    move-object v6, v7
    invoke-direct/range {v0 .. v6}, Landroid/webkit/WebResourceResponse;-><init>(Ljava/lang/String;Ljava/lang/String;ILjava/lang/String;Ljava/util/Map;Ljava/io/InputStream;)V
    :try_end_offline
    .catch Ljava/lang/Throwable; {:try_start_offline .. :try_end_offline} :catch_offline
    return-object v0

    :catch_offline
    move-exception v0
    :cond_offline_none
    const/4 v0, 0x0
    return-object v0
.end method

.method public shouldInterceptRequest(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Landroid/webkit/WebResourceResponse;
    .registers 5

    if-eqz p2, :cond_request_none
    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;
    move-result-object v0
    if-eqz v0, :cond_request_none
    invoke-virtual {v0}, Landroid/net/Uri;->toString()Ljava/lang/String;
    move-result-object v0
    invoke-virtual {p0, p1, v0}, Lcom/ymliberty/app/AppWebViewClient;->shouldInterceptRequest(Landroid/webkit/WebView;Ljava/lang/String;)Landroid/webkit/WebResourceResponse;
    move-result-object v0
    return-object v0

    :cond_request_none
    const/4 v0, 0x0
    return-object v0
.end method
