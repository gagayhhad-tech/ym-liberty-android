.class public Lcom/ymliberty/app/MainActivity;
.super Landroid/app/Activity;
.source "MainActivity.java"

# static fields
.field public static sInstance:Lcom/ymliberty/app/MainActivity;

# instance fields
.field public mWebView:Landroid/webkit/WebView;

# direct methods
.method public constructor <init>()V
    .registers 1

    invoke-direct {p0}, Landroid/app/Activity;-><init>()V

    return-void
.end method

.method public static onMediaAction(Ljava/lang/String;)V
    .registers 4

    sget-object v0, Lcom/ymliberty/app/MainActivity;->sInstance:Lcom/ymliberty/app/MainActivity;

    if-eqz v0, :cond_exit

    iget-object v1, v0, Lcom/ymliberty/app/MainActivity;->mWebView:Landroid/webkit/WebView;

    if-eqz v1, :cond_exit

    new-instance v2, Lcom/ymliberty/app/MediaActionRunnable;

    invoke-direct {v2, v1, p0}, Lcom/ymliberty/app/MediaActionRunnable;-><init>(Landroid/webkit/WebView;Ljava/lang/String;)V

    invoke-virtual {v1, v2}, Landroid/webkit/WebView;->post(Ljava/lang/Runnable;)Z

    :cond_exit
    return-void
.end method

.method public static onMediaSeek(J)V
    .registers 5

    sget-object v0, Lcom/ymliberty/app/MainActivity;->sInstance:Lcom/ymliberty/app/MainActivity;

    if-eqz v0, :cond_exit

    iget-object v1, v0, Lcom/ymliberty/app/MainActivity;->mWebView:Landroid/webkit/WebView;

    if-eqz v1, :cond_exit

    new-instance v2, Lcom/ymliberty/app/MediaSeekRunnable;

    invoke-direct {v2, v1, p0, p1}, Lcom/ymliberty/app/MediaSeekRunnable;-><init>(Landroid/webkit/WebView;J)V

    invoke-virtual {v1, v2}, Landroid/webkit/WebView;->post(Ljava/lang/Runnable;)Z

    :cond_exit
    return-void
.end method

# virtual methods
.method public onBackPressed()V
    .registers 2

    iget-object v0, p0, Lcom/ymliberty/app/MainActivity;->mWebView:Landroid/webkit/WebView;

    if-eqz v0, :cond_10

    invoke-virtual {v0}, Landroid/webkit/WebView;->canGoBack()Z

    move-result v0

    if-eqz v0, :cond_10

    iget-object v0, p0, Lcom/ymliberty/app/MainActivity;->mWebView:Landroid/webkit/WebView;

    invoke-virtual {v0}, Landroid/webkit/WebView;->goBack()V

    return-void

    :cond_10
    invoke-super {p0}, Landroid/app/Activity;->onBackPressed()V

    return-void
.end method

.method protected onCreate(Landroid/os/Bundle;)V
    .locals 10

    invoke-super {p0, p1}, Landroid/app/Activity;->onCreate(Landroid/os/Bundle;)V

    sput-object p0, Lcom/ymliberty/app/MainActivity;->sInstance:Lcom/ymliberty/app/MainActivity;

    # Register CrashHandler
    invoke-static {}, Ljava/lang/Thread;->getDefaultUncaughtExceptionHandler()Ljava/lang/Thread$UncaughtExceptionHandler;

    move-result-object v0

    new-instance v1, Lcom/ymliberty/app/CrashHandler;

    invoke-direct {v1, p0, v0}, Lcom/ymliberty/app/CrashHandler;-><init>(Landroid/content/Context;Ljava/lang/Thread$UncaughtExceptionHandler;)V

    invoke-static {v1}, Ljava/lang/Thread;->setDefaultUncaughtExceptionHandler(Ljava/lang/Thread$UncaughtExceptionHandler;)V

    :try_start_check_crash
    new-instance v0, Ljava/io/File;

    invoke-virtual {p0}, Landroid/app/Activity;->getFilesDir()Ljava/io/File;

    move-result-object v1

    const-string v2, "crash.txt"

    invoke-direct {v0, v1, v2}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    invoke-virtual {v0}, Ljava/io/File;->exists()Z

    move-result v1

    if-eqz v1, :cond_no_crash

    new-instance v1, Ljava/io/FileInputStream;

    invoke-direct {v1, v0}, Ljava/io/FileInputStream;-><init>(Ljava/io/File;)V

    invoke-virtual {v0}, Ljava/io/File;->length()J

    move-result-wide v2

    long-to-int v2, v2

    new-array v2, v2, [B

    invoke-virtual {v1, v2}, Ljava/io/FileInputStream;->read([B)I

    invoke-virtual {v1}, Ljava/io/FileInputStream;->close()V

    invoke-virtual {v0}, Ljava/io/File;->delete()Z

    new-instance v0, Ljava/lang/String;

    const-string v1, "UTF-8"

    invoke-direct {v0, v2, v1}, Ljava/lang/String;-><init>([BLjava/lang/String;)V

    new-instance v1, Landroid/app/AlertDialog$Builder;

    invoke-direct {v1, p0}, Landroid/app/AlertDialog$Builder;-><init>(Landroid/content/Context;)V

    const-string v2, "Crash Report"

    invoke-virtual {v1, v2}, Landroid/app/AlertDialog$Builder;->setTitle(Ljava/lang/CharSequence;)Landroid/app/AlertDialog$Builder;

    move-result-object v1

    invoke-virtual {v1, v0}, Landroid/app/AlertDialog$Builder;->setMessage(Ljava/lang/CharSequence;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    const-string v1, "OK"

    const/4 v2, 0x0

    invoke-virtual {v0, v1, v2}, Landroid/app/AlertDialog$Builder;->setPositiveButton(Ljava/lang/CharSequence;Landroid/content/DialogInterface$OnClickListener;)Landroid/app/AlertDialog$Builder;

    move-result-object v0

    invoke-virtual {v0}, Landroid/app/AlertDialog$Builder;->show()Landroid/app/AlertDialog;

    :cond_no_crash
    :try_end_check_crash
    .catch Ljava/lang/Throwable; {:try_start_check_crash .. :try_end_check_crash} :catch_check_crash

    :catch_check_crash

    const/4 v0, 0x1

    invoke-virtual {p0, v0}, Landroid/app/Activity;->requestWindowFeature(I)Z

    # Edge-to-Edge & Display Cutout (Extend under camera notch/dot)
    invoke-virtual {p0}, Landroid/app/Activity;->getWindow()Landroid/view/Window;

    move-result-object v1

    if-eqz v1, :cond_skip_cutout

    const/16 v2, 0x200

    invoke-virtual {v1, v2, v2}, Landroid/view/Window;->setFlags(II)V

    sget v2, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v3, 0x1c

    if-lt v2, v3, :cond_skip_cutout

    :try_start_cutout
    invoke-virtual {v1}, Landroid/view/Window;->getAttributes()Landroid/view/WindowManager$LayoutParams;

    move-result-object v2

    if-eqz v2, :cond_skip_cutout

    const/4 v3, 0x1

    iput v3, v2, Landroid/view/WindowManager$LayoutParams;->layoutInDisplayCutoutMode:I

    invoke-virtual {v1, v2}, Landroid/view/Window;->setAttributes(Landroid/view/WindowManager$LayoutParams;)V
    :try_end_cutout
    .catch Ljava/lang/Exception; {:try_start_cutout .. :try_end_cutout} :catch_cutout

    :catch_cutout
    :cond_skip_cutout

    # Request notification permission on Android 13+ (API 33+)
    sget v1, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v2, 0x21

    if-lt v1, v2, :cond_skip_perm

    :try_start_perm
    const-string v1, "android.permission.POST_NOTIFICATIONS"

    invoke-virtual {p0, v1}, Landroid/app/Activity;->checkSelfPermission(Ljava/lang/String;)I

    move-result v1

    if-eqz v1, :cond_skip_perm

    const/4 v1, 0x1

    new-array v1, v1, [Ljava/lang/String;

    const/4 v2, 0x0

    const-string v3, "android.permission.POST_NOTIFICATIONS"

    aput-object v3, v1, v2

    const/16 v2, 0x65

    invoke-virtual {p0, v1, v2}, Landroid/app/Activity;->requestPermissions([Ljava/lang/String;I)V
    :try_end_perm
    .catch Ljava/lang/Exception; {:try_start_perm .. :try_end_perm} :catch_perm

    :catch_perm
    :cond_skip_perm

    # Create and setup WebView
    new-instance v1, Landroid/webkit/WebView;

    invoke-direct {v1, p0}, Landroid/webkit/WebView;-><init>(Landroid/content/Context;)V

    iput-object v1, p0, Lcom/ymliberty/app/MainActivity;->mWebView:Landroid/webkit/WebView;

    invoke-virtual {v1}, Landroid/webkit/WebView;->getSettings()Landroid/webkit/WebSettings;

    move-result-object v1

    invoke-virtual {v1, v0}, Landroid/webkit/WebSettings;->setJavaScriptEnabled(Z)V

    invoke-virtual {v1, v0}, Landroid/webkit/WebSettings;->setDomStorageEnabled(Z)V

    invoke-virtual {v1, v0}, Landroid/webkit/WebSettings;->setDatabaseEnabled(Z)V

    const/4 v2, 0x0

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setMediaPlaybackRequiresUserGesture(Z)V

    invoke-virtual {v1, v2}, Landroid/webkit/WebSettings;->setMixedContentMode(I)V

    invoke-virtual {v1, v0}, Landroid/webkit/WebSettings;->setAllowFileAccess(Z)V

    invoke-virtual {v1, v0}, Landroid/webkit/WebSettings;->setAllowContentAccess(Z)V

    invoke-virtual {v1, v0}, Landroid/webkit/WebSettings;->setAllowFileAccessFromFileURLs(Z)V

    invoke-virtual {v1, v0}, Landroid/webkit/WebSettings;->setAllowUniversalAccessFromFileURLs(Z)V

    invoke-virtual {v1, v0}, Landroid/webkit/WebSettings;->setJavaScriptCanOpenWindowsAutomatically(Z)V

    # Register AndroidBridge
    iget-object v1, p0, Lcom/ymliberty/app/MainActivity;->mWebView:Landroid/webkit/WebView;

    new-instance v2, Lcom/ymliberty/app/AndroidBridge;

    invoke-direct {v2, p0}, Lcom/ymliberty/app/AndroidBridge;-><init>(Landroid/content/Context;)V

    const-string v3, "AndroidBridge"

    invoke-virtual {v1, v2, v3}, Landroid/webkit/WebView;->addJavascriptInterface(Ljava/lang/Object;Ljava/lang/String;)V

    iget-object v0, p0, Lcom/ymliberty/app/MainActivity;->mWebView:Landroid/webkit/WebView;

    new-instance v1, Lcom/ymliberty/app/AppWebViewClient;

    invoke-direct {v1}, Lcom/ymliberty/app/AppWebViewClient;-><init>()V

    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebViewClient(Landroid/webkit/WebViewClient;)V

    iget-object v0, p0, Lcom/ymliberty/app/MainActivity;->mWebView:Landroid/webkit/WebView;

    new-instance v1, Landroid/webkit/WebChromeClient;

    invoke-direct {v1}, Landroid/webkit/WebChromeClient;-><init>()V

    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->setWebChromeClient(Landroid/webkit/WebChromeClient;)V

    iget-object v0, p0, Lcom/ymliberty/app/MainActivity;->mWebView:Landroid/webkit/WebView;

    invoke-virtual {p0, v0}, Landroid/app/Activity;->setContentView(Landroid/view/View;)V

    iget-object v0, p0, Lcom/ymliberty/app/MainActivity;->mWebView:Landroid/webkit/WebView;

    const-string v1, "file:///android_asset/www/index.html"

    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->loadUrl(Ljava/lang/String;)V

    return-void
.end method

.method protected onDestroy()V
    .registers 2

    const/4 v0, 0x0

    sput-object v0, Lcom/ymliberty/app/MainActivity;->sInstance:Lcom/ymliberty/app/MainActivity;

    iget-object v0, p0, Lcom/ymliberty/app/MainActivity;->mWebView:Landroid/webkit/WebView;

    if-eqz v0, :cond_7

    invoke-virtual {v0}, Landroid/webkit/WebView;->destroy()V

    :cond_7
    invoke-super {p0}, Landroid/app/Activity;->onDestroy()V

    return-void
.end method
