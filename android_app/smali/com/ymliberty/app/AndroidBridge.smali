.class public Lcom/ymliberty/app/AndroidBridge;
.super Ljava/lang/Object;
.source "AndroidBridge.java"

# instance fields
.field private final mContext:Landroid/content/Context;

# direct methods
.method public constructor <init>(Landroid/content/Context;)V
    .registers 2

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/ymliberty/app/AndroidBridge;->mContext:Landroid/content/Context;

    return-void
.end method

# virtual methods
.method public updateMedia(Ljava/lang/String;Ljava/lang/String;Z)V
    .registers 11
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    const/4 v4, 0x0

    const/4 v5, 0x0

    const/4 v6, 0x0

    move-object v0, p0

    move-object v1, p1

    move-object v2, p2

    move v3, p3

    invoke-virtual/range {v0 .. v6}, Lcom/ymliberty/app/AndroidBridge;->updateMedia(Ljava/lang/String;Ljava/lang/String;ZIILjava/lang/String;)V

    return-void
.end method

.method public updateMedia(Ljava/lang/String;Ljava/lang/String;ZIILjava/lang/String;)V
    .registers 12
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    :try_start_0
    new-instance v0, Landroid/content/Intent;

    iget-object v1, p0, Lcom/ymliberty/app/AndroidBridge;->mContext:Landroid/content/Context;

    const-class v2, Lcom/ymliberty/app/MediaPlaybackService;

    invoke-direct {v0, v1, v2}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    const-string v1, "com.ymliberty.app.ACTION_UPDATE"

    invoke-virtual {v0, v1}, Landroid/content/Intent;->setAction(Ljava/lang/String;)Landroid/content/Intent;

    const-string v1, "title"

    invoke-virtual {v0, v1, p1}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;

    const-string v1, "artist"

    invoke-virtual {v0, v1, p2}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;

    const-string v1, "isPlaying"

    invoke-virtual {v0, v1, p3}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Z)Landroid/content/Intent;

    const-string v1, "positionMs"

    invoke-virtual {v0, v1, p4}, Landroid/content/Intent;->putExtra(Ljava/lang/String;I)Landroid/content/Intent;

    const-string v1, "durationMs"

    invoke-virtual {v0, v1, p5}, Landroid/content/Intent;->putExtra(Ljava/lang/String;I)Landroid/content/Intent;

    const-string v1, "coverUrl"

    invoke-virtual {v0, v1, p6}, Landroid/content/Intent;->putExtra(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;

    iget-object v1, p0, Lcom/ymliberty/app/AndroidBridge;->mContext:Landroid/content/Context;

    sget v2, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v3, 0x1a

    if-lt v2, v3, :cond_pre_o

    invoke-virtual {v1, v0}, Landroid/content/Context;->startForegroundService(Landroid/content/Intent;)Landroid/content/ComponentName;

    goto :goto_svc_done

    :cond_pre_o
    invoke-virtual {v1, v0}, Landroid/content/Context;->startService(Landroid/content/Intent;)Landroid/content/ComponentName;

    :goto_svc_done
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    # The normal path must return BEFORE the handler. Falling through into
    # `move-exception` is illegal: that instruction is only valid as the entry
    # point of an exception handler (ART: "invalid use of move-exception as
    # branch target").
    return-void

    :catch_0
    move-exception v1

    const-string v0, "YMLiberty"

    const-string v2, "updateMedia failed"

    invoke-static {v0, v2, v1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    return-void
.end method

.method public requestNotificationPermission()V
    .registers 5
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    :try_start_perm_req
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x21

    if-lt v0, v1, :cond_perm_done

    iget-object v0, p0, Lcom/ymliberty/app/AndroidBridge;->mContext:Landroid/content/Context;

    instance-of v1, v0, Landroid/app/Activity;

    if-eqz v1, :cond_perm_done

    check-cast v0, Landroid/app/Activity;

    const-string v1, "android.permission.POST_NOTIFICATIONS"

    invoke-virtual {v0, v1}, Landroid/app/Activity;->checkSelfPermission(Ljava/lang/String;)I

    move-result v1

    if-eqz v1, :cond_perm_done

    const/4 v1, 0x1

    new-array v1, v1, [Ljava/lang/String;

    const/4 v2, 0x0

    const-string v3, "android.permission.POST_NOTIFICATIONS"

    aput-object v3, v1, v2

    const/16 v2, 0x65

    invoke-virtual {v0, v1, v2}, Landroid/app/Activity;->requestPermissions([Ljava/lang/String;I)V

    :cond_perm_done
    :try_end_perm_req
    .catch Ljava/lang/Throwable; {:try_start_perm_req .. :try_end_perm_req} :catch_perm_req

    :catch_perm_req
    return-void
.end method

.method public getVersionCode()I
    .registers 4
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    :try_start_0
    iget-object v0, p0, Lcom/ymliberty/app/AndroidBridge;->mContext:Landroid/content/Context;

    invoke-virtual {v0}, Landroid/content/Context;->getPackageManager()Landroid/content/pm/PackageManager;

    move-result-object v0

    iget-object v1, p0, Lcom/ymliberty/app/AndroidBridge;->mContext:Landroid/content/Context;

    invoke-virtual {v1}, Landroid/content/Context;->getPackageName()Ljava/lang/String;

    move-result-object v1

    const/4 v2, 0x0

    invoke-virtual {v0, v1, v2}, Landroid/content/pm/PackageManager;->getPackageInfo(Ljava/lang/String;I)Landroid/content/pm/PackageInfo;

    move-result-object v0

    iget v0, v0, Landroid/content/pm/PackageInfo;->versionCode:I
    return v0
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    const/4 v0, 0x1
    return v0
.end method

.method public logLine(Ljava/lang/String;Ljava/lang/String;)V
    .registers 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    :try_start_0
    invoke-static {p1, p2}, Lcom/ymliberty/app/YMLogger;->log(Ljava/lang/String;Ljava/lang/String;)V
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    return-void

    :catch_0
    return-void
.end method

.method public logError(Ljava/lang/String;Ljava/lang/String;)V
    .registers 3
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    :try_start_0
    invoke-static {p1, p2}, Lcom/ymliberty/app/YMLogger;->logError(Ljava/lang/String;Ljava/lang/String;)V
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    return-void

    :catch_0
    return-void
.end method
.method public getVersionName()Ljava/lang/String;
    .registers 4
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    :try_start_0
    iget-object v0, p0, Lcom/ymliberty/app/AndroidBridge;->mContext:Landroid/content/Context;

    invoke-virtual {v0}, Landroid/content/Context;->getPackageManager()Landroid/content/pm/PackageManager;

    move-result-object v0

    iget-object v1, p0, Lcom/ymliberty/app/AndroidBridge;->mContext:Landroid/content/Context;

    invoke-virtual {v1}, Landroid/content/Context;->getPackageName()Ljava/lang/String;

    move-result-object v1

    const/4 v2, 0x0

    invoke-virtual {v0, v1, v2}, Landroid/content/pm/PackageManager;->getPackageInfo(Ljava/lang/String;I)Landroid/content/pm/PackageInfo;

    move-result-object v0

    iget-object v0, v0, Landroid/content/pm/PackageInfo;->versionName:Ljava/lang/String;
    return-object v0
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    const-string v0, "1.0.0"
    return-object v0
.end method

.method public downloadAndInstall(Ljava/lang/String;)V
    .registers 6
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    :try_start_0
    # Only ever download an update from the trusted release hosts. Without this
    # guard any injected script could make the app fetch and offer to install an
    # arbitrary APK.
    if-eqz p1, :cond_exit

    invoke-static {p1}, Lcom/ymliberty/app/AndroidBridge;->isTrustedUpdateUrl(Ljava/lang/String;)Z

    move-result v0

    if-nez v0, :cond_trusted

    const-string v0, "YMLiberty"

    new-instance v1, Ljava/lang/StringBuilder;

    const-string v2, "Refused to download update from untrusted URL: "

    invoke-direct {v1, v2}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V

    invoke-virtual {v1, p1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v1

    invoke-static {v0, v1}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;)I

    return-void

    :cond_trusted
    sget-object v0, Lcom/ymliberty/app/MainActivity;->sInstance:Lcom/ymliberty/app/MainActivity;

    const/4 v1, 0x0

    if-eqz v0, :cond_get_wv

    iget-object v1, v0, Lcom/ymliberty/app/MainActivity;->mWebView:Landroid/webkit/WebView;

    :cond_get_wv
    new-instance v0, Lcom/ymliberty/app/ApkDownloadRunnable;

    iget-object v2, p0, Lcom/ymliberty/app/AndroidBridge;->mContext:Landroid/content/Context;

    invoke-direct {v0, v2, v1, p1}, Lcom/ymliberty/app/ApkDownloadRunnable;-><init>(Landroid/content/Context;Landroid/webkit/WebView;Ljava/lang/String;)V

    new-instance v1, Ljava/lang/Thread;

    invoke-direct {v1, v0}, Ljava/lang/Thread;-><init>(Ljava/lang/Runnable;)V

    invoke-virtual {v1}, Ljava/lang/Thread;->start()V
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    goto :goto_done

    :catch_0
    move-exception v0

    const-string v1, "YMLiberty"

    const-string v2, "downloadAndInstall failed"

    invoke-static {v1, v2, v0}, Landroid/util/Log;->e(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :goto_done
    :cond_exit
    return-void
.end method

# Allowlist for in-app update downloads: must be HTTPS on one of the known hosts.
.method private static isTrustedUpdateUrl(Ljava/lang/String;)Z
    .registers 5

    if-nez p0, :cond_start
    const/4 v0, 0x0
    return v0

    :cond_start
    # Require https://
    const-string v0, "https://"

    invoke-virtual {p0, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-nez v0, :cond_parse
    const/4 v0, 0x0
    return v0

    :cond_parse
    :try_start_0
    # Uri.parse(String) takes ONE argument. The 0x7 that used to be passed here
    # was a leftover from a two-arg overload that does not exist, so the
    # verifier rejected the whole class.
    invoke-static {p0}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v0

    invoke-virtual {v0}, Landroid/net/Uri;->getHost()Ljava/lang/String;

    move-result-object v0

    if-nez v0, :cond_lower
    const/4 v1, 0x0
    return v1

    :cond_lower
    sget-object v1, Ljava/util/Locale;->US:Ljava/util/Locale;

    invoke-virtual {v0, v1}, Ljava/lang/String;->toLowerCase(Ljava/util/Locale;)Ljava/lang/String;

    move-result-object v0

    # Exact host matches
    const-string v1, "ym-liberty-bot.vercel.app"

    invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_c1
    const/4 v0, 0x1
    return v0

    :cond_c1
    const-string v1, "github.com"

    invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_c2
    const/4 v0, 0x1
    return v0

    :cond_c2
    # GitHub release assets and CDN hosts
    const-string v1, "objects.githubusercontent.com"

    invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_c3
    const/4 v0, 0x1
    return v0

    :cond_c3
    const-string v1, ".githubusercontent.com"

    invoke-virtual {v0, v1}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z

    move-result v1

    if-eqz v1, :cond_exit_parse
    const/4 v0, 0x1
    return v0

    :cond_exit_parse
    const/4 v0, 0x0
    return v0
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    const/4 v0, 0x0
    return v0
.end method

# Enqueue a track for download through the system DownloadManager.
#
#   p1 url       https source of the audio payload
#   p2 fileName  sanitized display name, e.g. "Artist - Title.mp3"
#   p3 mimeType  "audio/mpeg" or "audio/flac" (must not be null)
#   p4 toCache   true  -> app-private external dir (never needs a permission)
#                false -> public Music/ dir
#
# Returns true when the download was enqueued. DownloadManager owns the HTTP
# transfer and posts its own progress notification, so there is no progress
# callback back into JS on purpose.
#
# On API < 29 the public Music/ dir requires WRITE_EXTERNAL_STORAGE, which this
# app does not declare. Rather than fail, that case falls back to the
# app-private dir so the file still lands on the device. API 29+ needs no
# permission for a DownloadManager write into public storage.
.method public downloadTrack(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Z)Z
    .registers 10
    .annotation runtime Landroid/webkit/JavascriptInterface;
    .end annotation

    :try_start_0
    if-eqz p1, :cond_fail

    if-eqz p2, :cond_fail

    if-eqz p3, :cond_fail

    # The file name comes from a track title, so it is untrusted: a "/" or ".."
    # would let a caller escape the destination directory.
    const-string v0, "/"

    invoke-virtual {p2, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_fail

    const-string v0, ".."

    invoke-virtual {p2, v0}, Ljava/lang/String;->contains(Ljava/lang/CharSequence;)Z

    move-result v0

    if-nez v0, :cond_fail

    const-string v0, "https://"

    invoke-virtual {p1, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z

    move-result v0

    if-eqz v0, :cond_fail

    invoke-static {p1}, Landroid/net/Uri;->parse(Ljava/lang/String;)Landroid/net/Uri;

    move-result-object v0

    iget-object v1, p0, Lcom/ymliberty/app/AndroidBridge;->mContext:Landroid/content/Context;

    const-string v2, "download"

    invoke-virtual {v1, v2}, Landroid/content/Context;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v2

    check-cast v2, Landroid/app/DownloadManager;

    new-instance v3, Landroid/app/DownloadManager$Request;

    invoke-direct {v3, v0}, Landroid/app/DownloadManager$Request;-><init>(Landroid/net/Uri;)V

    invoke-virtual {v3, p2}, Landroid/app/DownloadManager$Request;->setTitle(Ljava/lang/CharSequence;)Landroid/app/DownloadManager$Request;

    invoke-virtual {v3, p2}, Landroid/app/DownloadManager$Request;->setDescription(Ljava/lang/CharSequence;)Landroid/app/DownloadManager$Request;

    invoke-virtual {v3, p3}, Landroid/app/DownloadManager$Request;->setMimeType(Ljava/lang/String;)Landroid/app/DownloadManager$Request;

    const-string v0, "User-Agent"

    const-string v1, "YandexMusicAndroid/24023621"

    invoke-virtual {v3, v0, v1}, Landroid/app/DownloadManager$Request;->addRequestHeader(Ljava/lang/String;Ljava/lang/String;)Landroid/app/DownloadManager$Request;

    const-string v0, "Accept"

    const-string v1, "audio/*,*/*;q=0.8"

    invoke-virtual {v3, v0, v1}, Landroid/app/DownloadManager$Request;->addRequestHeader(Ljava/lang/String;Ljava/lang/String;)Landroid/app/DownloadManager$Request;

    # VISIBILITY_VISIBLE_NOTIFY_COMPLETED (1). v0 is a free local here, reused so
    # v4 stays available for the DIRECTORY_MUSIC string below.
    const/4 v0, 0x1

    invoke-virtual {v3, v0}, Landroid/app/DownloadManager$Request;->setNotificationVisibility(I)Landroid/app/DownloadManager$Request;

    sget-object v4, Landroid/os/Environment;->DIRECTORY_MUSIC:Ljava/lang/String;

    # toCache (p4) true -> app-private external dir, which needs no permission on
    # any API and survives until the user clears app data.
    if-nez p4, :cond_cache

    # toCache false -> public Music/. On API 29+ (scoped storage) DownloadManager
    # may write there without any permission, so go straight to it.
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x1d

    if-ge v0, v1, :cond_public

    # API < 29 still needs WRITE_EXTERNAL_STORAGE for the public dir. If it was
    # not granted, fall back to the private dir instead of failing the download.
    # checkSelfPermission returns 0 for GRANTED and -1 for DENIED.
    iget-object v0, p0, Lcom/ymliberty/app/AndroidBridge;->mContext:Landroid/content/Context;

    const-string v1, "android.permission.WRITE_EXTERNAL_STORAGE"

    invoke-virtual {v0, v1}, Landroid/content/Context;->checkSelfPermission(Ljava/lang/String;)I

    move-result v0

    if-nez v0, :cond_private_fallback

    invoke-virtual {v3, v4, p2}, Landroid/app/DownloadManager$Request;->setDestinationInExternalPublicDir(Ljava/lang/String;Ljava/lang/String;)Landroid/app/DownloadManager$Request;

    goto :cond_enqueue

    :cond_private_fallback
    iget-object v1, p0, Lcom/ymliberty/app/AndroidBridge;->mContext:Landroid/content/Context;

    invoke-virtual {v3, v1, v4, p2}, Landroid/app/DownloadManager$Request;->setDestinationInExternalFilesDir(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)Landroid/app/DownloadManager$Request;

    goto :cond_enqueue

    :cond_public
    invoke-virtual {v3, v4, p2}, Landroid/app/DownloadManager$Request;->setDestinationInExternalPublicDir(Ljava/lang/String;Ljava/lang/String;)Landroid/app/DownloadManager$Request;

    goto :cond_enqueue

    :cond_cache
    iget-object v1, p0, Lcom/ymliberty/app/AndroidBridge;->mContext:Landroid/content/Context;

    invoke-virtual {v3, v1, v4, p2}, Landroid/app/DownloadManager$Request;->setDestinationInExternalFilesDir(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;)Landroid/app/DownloadManager$Request;

    :cond_enqueue
    invoke-virtual {v2, v3}, Landroid/app/DownloadManager;->enqueue(Landroid/app/DownloadManager$Request;)J
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    const/4 v0, 0x1

    return v0

    :catch_0
    move-exception v0

    const-string v1, "YMLiberty"

    const-string v2, "downloadTrack failed"

    invoke-static {v1, v2, v0}, Landroid/util/Log;->e(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I

    :cond_fail
    const/4 v0, 0x0

    return v0
.end method
