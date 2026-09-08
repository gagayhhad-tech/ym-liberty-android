.class public Lcom/ymliberty/app/ApkDownloadRunnable;
.super Ljava/lang/Object;
.implements Ljava/lang/Runnable;
.source "ApkDownloadRunnable.java"

# instance fields
.field private final mContext:Landroid/content/Context;

.field private final mUrlString:Ljava/lang/String;

.field private final mWebView:Landroid/webkit/WebView;

# direct methods
.method public constructor <init>(Landroid/content/Context;Landroid/webkit/WebView;Ljava/lang/String;)V
    .registers 4

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/ymliberty/app/ApkDownloadRunnable;->mContext:Landroid/content/Context;

    iput-object p2, p0, Lcom/ymliberty/app/ApkDownloadRunnable;->mWebView:Landroid/webkit/WebView;

    iput-object p3, p0, Lcom/ymliberty/app/ApkDownloadRunnable;->mUrlString:Ljava/lang/String;

    return-void
.end method

# virtual methods
.method public run()V
    .registers 12

    :try_start_0
    new-instance v0, Ljava/net/URL;

    iget-object v1, p0, Lcom/ymliberty/app/ApkDownloadRunnable;->mUrlString:Ljava/lang/String;

    invoke-direct {v0, v1}, Ljava/net/URL;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0}, Ljava/net/URL;->openConnection()Ljava/net/URLConnection;

    move-result-object v0

    check-cast v0, Ljava/net/HttpURLConnection;

    const/16 v1, 0x3a98

    invoke-virtual {v0, v1}, Ljava/net/HttpURLConnection;->setConnectTimeout(I)V

    invoke-virtual {v0, v1}, Ljava/net/HttpURLConnection;->setReadTimeout(I)V

    const/4 v1, 0x1

    invoke-virtual {v0, v1}, Ljava/net/HttpURLConnection;->setDoInput(Z)V

    invoke-virtual {v0}, Ljava/net/HttpURLConnection;->connect()V

    invoke-virtual {v0}, Ljava/net/HttpURLConnection;->getContentLength()I

    move-result v1

    invoke-virtual {v0}, Ljava/net/HttpURLConnection;->getInputStream()Ljava/io/InputStream;

    move-result-object v0

    new-instance v2, Ljava/io/File;

    iget-object v3, p0, Lcom/ymliberty/app/ApkDownloadRunnable;->mContext:Landroid/content/Context;

    invoke-virtual {v3}, Landroid/content/Context;->getCacheDir()Ljava/io/File;

    move-result-object v3

    const-string v4, "update.apk"

    invoke-direct {v2, v3, v4}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    new-instance v3, Ljava/io/FileOutputStream;

    invoke-direct {v3, v2}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;)V

    const/16 v2, 0x2000

    new-array v2, v2, [B

    const/4 v4, 0x0

    const/4 v5, 0x0

    :cond_loop
    invoke-virtual {v0, v2}, Ljava/io/InputStream;->read([B)I

    move-result v6

    const/4 v7, -0x1

    if-eq v6, v7, :cond_finish

    const/4 v7, 0x0

    invoke-virtual {v3, v2, v7, v6}, Ljava/io/FileOutputStream;->write([BII)V

    add-int/2addr v4, v6

    if-lez v1, :cond_loop

    mul-int/lit8 v6, v4, 0x64

    div-int/2addr v6, v1

    sub-int v7, v6, v5

    const/4 v8, 0x2

    if-lt v7, v8, :cond_loop

    move v5, v6

    iget-object v7, p0, Lcom/ymliberty/app/ApkDownloadRunnable;->mWebView:Landroid/webkit/WebView;

    if-eqz v7, :cond_loop

    new-instance v8, Lcom/ymliberty/app/UpdateProgressRunnable;

    const/4 v9, 0x0

    invoke-direct {v8, v7, v6, v9}, Lcom/ymliberty/app/UpdateProgressRunnable;-><init>(Landroid/webkit/WebView;ILjava/lang/String;)V

    invoke-virtual {v7, v8}, Landroid/webkit/WebView;->post(Ljava/lang/Runnable;)Z

    goto :cond_loop

    :cond_finish
    invoke-virtual {v3}, Ljava/io/FileOutputStream;->flush()V

    invoke-virtual {v3}, Ljava/io/FileOutputStream;->close()V

    invoke-virtual {v0}, Ljava/io/InputStream;->close()V

    # Report 100%
    iget-object v0, p0, Lcom/ymliberty/app/ApkDownloadRunnable;->mWebView:Landroid/webkit/WebView;

    if-eqz v0, :cond_install

    new-instance v1, Lcom/ymliberty/app/UpdateProgressRunnable;

    const/16 v2, 0x64

    const/4 v3, 0x0

    invoke-direct {v1, v0, v2, v3}, Lcom/ymliberty/app/UpdateProgressRunnable;-><init>(Landroid/webkit/WebView;ILjava/lang/String;)V

    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->post(Ljava/lang/Runnable;)Z

    :cond_install
    # Trigger ACTION_VIEW Intent
    new-instance v0, Landroid/content/Intent;

    const-string v1, "android.intent.action.VIEW"

    invoke-direct {v0, v1}, Landroid/content/Intent;-><init>(Ljava/lang/String;)V

    const-string v1, "content://com.ymliberty.app.updateprovider/update.apk"

    invoke-static {v1}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v1

    const-string v2, "application/vnd.android.package-archive"

    invoke-virtual {v0, v1, v2}, Landroid/content/Intent;->setDataAndType(Landroid/net/Uri;Ljava/lang/String;)Landroid/content/Intent;

    const v1, 0x10000001 # FLAG_ACTIVITY_NEW_TASK | FLAG_GRANT_READ_URI_PERMISSION

    invoke-virtual {v0, v1}, Landroid/content/Intent;->addFlags(I)Landroid/content/Intent;

    iget-object v1, p0, Lcom/ymliberty/app/ApkDownloadRunnable;->mContext:Landroid/content/Context;

    invoke-virtual {v1, v0}, Landroid/content/Context;->startActivity(Landroid/content/Intent;)V
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_err

    goto :cond_exit

    :catch_err
    move-exception v0

    iget-object v1, p0, Lcom/ymliberty/app/ApkDownloadRunnable;->mWebView:Landroid/webkit/WebView;

    if-eqz v1, :cond_exit

    new-instance v2, Lcom/ymliberty/app/UpdateProgressRunnable;

    invoke-virtual {v0}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;

    move-result-object v0

    const/4 v3, 0x0

    invoke-direct {v2, v1, v3, v0}, Lcom/ymliberty/app/UpdateProgressRunnable;-><init>(Landroid/webkit/WebView;ILjava/lang/String;)V

    invoke-virtual {v1, v2}, Landroid/webkit/WebView;->post(Ljava/lang/Runnable;)Z

    :cond_exit
    return-void
.end method