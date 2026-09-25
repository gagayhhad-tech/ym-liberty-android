.class public final Lcom/ymliberty/app/TrackDownloadRunnable;
.super Ljava/lang/Object;
.implements Ljava/lang/Runnable;
.source "TrackDownloadRunnable.java"

.field private final mContext:Landroid/content/Context;
.field private final mUrl:Ljava/lang/String;
.field private final mFileName:Ljava/lang/String;
.field private final mToCache:Z
.field private final mKeyBase64:Ljava/lang/String;
.field private mDownloaded:I
.field private mLastPercent:I

.method public constructor <init>(Landroid/content/Context;Ljava/lang/String;Ljava/lang/String;ZLjava/lang/String;)V
    .registers 7

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mContext:Landroid/content/Context;
    iput-object p2, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mUrl:Ljava/lang/String;
    iput-object p3, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mFileName:Ljava/lang/String;
    iput-boolean p4, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mToCache:Z
    iput-object p5, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mKeyBase64:Ljava/lang/String;
    const/4 v0, 0x0
    iput v0, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mDownloaded:I
    const/4 v0, -0x1
    iput v0, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mLastPercent:I
    return-void
.end method

.method private log(Ljava/lang/String;)V
    .registers 3
    const-string v0, "DOWNLOAD"
    invoke-static {v0, p1}, Lcom/ymliberty/app/YMLogger;->log(Ljava/lang/String;Ljava/lang/String;)V
    return-void
.end method

.method private notifyProgress(IZLjava/lang/String;)V
    .registers 16
    sget-object v0, Lcom/ymliberty/app/MainActivity;->sInstance:Lcom/ymliberty/app/MainActivity;
    if-eqz v0, :cond_exit
    iget-object v0, v0, Lcom/ymliberty/app/MainActivity;->mWebView:Landroid/webkit/WebView;
    if-eqz v0, :cond_exit
    new-instance v1, Lcom/ymliberty/app/TrackDownloadProgressRunnable;
    move-object v2, v0
    iget-object v3, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mFileName:Ljava/lang/String;
    move v4, p1
    move v5, p2
    move-object v6, p3
    invoke-direct/range {v1 .. v6}, Lcom/ymliberty/app/TrackDownloadProgressRunnable;-><init>(Landroid/webkit/WebView;Ljava/lang/String;IZLjava/lang/String;)V
    invoke-virtual {v0, v1}, Landroid/webkit/WebView;->post(Ljava/lang/Runnable;)Z
    :cond_exit
    return-void
.end method

.method public run()V
    .registers 16

    const/4 v0, 0x0
    :try_start_0
    const/4 v1, 0x0
    const/4 v2, 0x0
    const/4 v3, 0x0
    invoke-direct {p0, v1, v2, v3}, Lcom/ymliberty/app/TrackDownloadRunnable;->notifyProgress(IZLjava/lang/String;)V

    new-instance v1, Ljava/net/URL;
    iget-object v2, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mUrl:Ljava/lang/String;
    invoke-direct {v1, v2}, Ljava/net/URL;-><init>(Ljava/lang/String;)V
    invoke-virtual {v1}, Ljava/net/URL;->openConnection()Ljava/net/URLConnection;
    move-result-object v1
    check-cast v1, Ljava/net/HttpURLConnection;

    const/16 v2, 0x3a98
    invoke-virtual {v1, v2}, Ljava/net/HttpURLConnection;->setConnectTimeout(I)V
    invoke-virtual {v1, v2}, Ljava/net/HttpURLConnection;->setReadTimeout(I)V
    const/4 v2, 0x1
    invoke-virtual {v1, v2}, Ljava/net/HttpURLConnection;->setDoInput(Z)V
    const-string v2, "User-Agent"
    const-string v3, "YandexMusicAndroid/24023621"
    invoke-virtual {v1, v2, v3}, Ljava/net/HttpURLConnection;->setRequestProperty(Ljava/lang/String;Ljava/lang/String;)V
    const-string v2, "Accept"
    const-string v3, "audio/*,*/*;q=0.8"
    invoke-virtual {v1, v2, v3}, Ljava/net/HttpURLConnection;->setRequestProperty(Ljava/lang/String;Ljava/lang/String;)V
    invoke-virtual {v1}, Ljava/net/HttpURLConnection;->connect()V

    invoke-virtual {v1}, Ljava/net/HttpURLConnection;->getResponseCode()I
    move-result v2
    const/16 v3, 0xc8
    if-lt v2, v3, :cond_http_error
    const/16 v3, 0x12c
    if-lt v2, v3, :cond_http_ok

    :cond_http_error
    new-instance v3, Ljava/io/IOException;
    new-instance v4, Ljava/lang/StringBuilder;
    const-string v5, "HTTP "
    invoke-direct {v4, v5}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V
    invoke-virtual {v4, v2}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;
    invoke-virtual {v4}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v2
    invoke-direct {v3, v2}, Ljava/io/IOException;-><init>(Ljava/lang/String;)V
    throw v3

    :cond_http_ok
    invoke-virtual {v1}, Ljava/net/HttpURLConnection;->getContentLength()I
    move-result v12
    iget-object v2, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mContext:Landroid/content/Context;
    iget-boolean v3, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mToCache:Z
    if-eqz v3, :cond_music_dir
    invoke-virtual {v2}, Landroid/content/Context;->getCacheDir()Ljava/io/File;
    move-result-object v2
    new-instance v3, Ljava/io/File;
    const-string v4, "ym-downloads"
    invoke-direct {v3, v2, v4}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V
    move-object v2, v3
    goto :cond_dir_ready

    :cond_music_dir
    sget-object v3, Landroid/os/Environment;->DIRECTORY_MUSIC:Ljava/lang/String;
    invoke-virtual {v2, v3}, Landroid/content/Context;->getExternalFilesDir(Ljava/lang/String;)Ljava/io/File;
    move-result-object v2

    :cond_dir_ready
    if-eqz v2, :cond_no_dir
    invoke-virtual {v2}, Ljava/io/File;->mkdirs()Z

    new-instance v3, Ljava/io/File;
    iget-object v4, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mFileName:Ljava/lang/String;
    invoke-direct {v3, v2, v4}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V
    new-instance v4, Ljava/io/File;
    new-instance v5, Ljava/lang/StringBuilder;
    iget-object v6, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mFileName:Ljava/lang/String;
    invoke-direct {v5, v6}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V
    const-string v6, ".part"
    invoke-virtual {v5, v6}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v5}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v5
    invoke-direct {v4, v2, v5}, Ljava/io/File;-><init>(Ljava/io/File;Ljava/lang/String;)V

    invoke-virtual {v1}, Ljava/net/HttpURLConnection;->getInputStream()Ljava/io/InputStream;
    move-result-object v5

    # Yandex get-file-info returns AES-CTR encrypted audio. Decrypt while
    # streaming so no second copy of the track is kept in memory.
    iget-object v6, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mKeyBase64:Ljava/lang/String;
    const/4 v7, 0x0
    invoke-static {v6, v7}, Landroid/util/Base64;->decode(Ljava/lang/String;I)[B
    move-result-object v6
    new-instance v7, Ljavax/crypto/spec/SecretKeySpec;
    const-string v8, "AES"
    invoke-direct {v7, v6, v8}, Ljavax/crypto/spec/SecretKeySpec;-><init>([BLjava/lang/String;)V
    const/16 v6, 0x10
    new-array v6, v6, [B
    new-instance v8, Ljavax/crypto/spec/IvParameterSpec;
    invoke-direct {v8, v6}, Ljavax/crypto/spec/IvParameterSpec;-><init>([B)V
    const-string v6, "AES/CTR/NoPadding"
    invoke-static {v6}, Ljavax/crypto/Cipher;->getInstance(Ljava/lang/String;)Ljavax/crypto/Cipher;
    move-result-object v6
    const/4 v9, 0x2
    invoke-virtual {v6, v9, v7, v8}, Ljavax/crypto/Cipher;->init(ILjava/security/Key;Ljava/security/spec/AlgorithmParameterSpec;)V
    new-instance v7, Ljavax/crypto/CipherInputStream;
    invoke-direct {v7, v5, v6}, Ljavax/crypto/CipherInputStream;-><init>(Ljava/io/InputStream;Ljavax/crypto/Cipher;)V
    move-object v5, v7
    new-instance v6, Ljava/io/FileOutputStream;
    invoke-direct {v6, v4}, Ljava/io/FileOutputStream;-><init>(Ljava/io/File;)V
    const/16 v7, 0x4000
    new-array v7, v7, [B
    const-wide/16 v8, 0x0

    :cond_read
    invoke-virtual {v5, v7}, Ljava/io/InputStream;->read([B)I
    move-result v10
    const/4 v11, -0x1
    if-eq v10, v11, :cond_finish
    const/4 v11, 0x0
    invoke-virtual {v6, v7, v11, v10}, Ljava/io/FileOutputStream;->write([BII)V
    move v14, v10
    int-to-long v10, v10
    add-long/2addr v8, v10
    if-lez v12, :cond_read
    iget v13, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mDownloaded:I
    add-int/2addr v13, v14
    iput v13, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mDownloaded:I
    mul-int/lit8 v13, v13, 0x64
    div-int/2addr v13, v12
    iget v14, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mLastPercent:I
    sub-int v14, v13, v14
    const/4 v10, 0x2
    if-lt v14, v10, :cond_read
    iput v13, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mLastPercent:I
    const/4 v14, 0x0
    const/4 v12, 0x0
    invoke-direct {p0, v13, v14, v12}, Lcom/ymliberty/app/TrackDownloadRunnable;->notifyProgress(IZLjava/lang/String;)V
    goto :cond_read

    :cond_finish
    invoke-virtual {v6}, Ljava/io/FileOutputStream;->flush()V
    invoke-virtual {v6}, Ljava/io/FileOutputStream;->close()V
    invoke-virtual {v5}, Ljava/io/InputStream;->close()V
    invoke-virtual {v1}, Ljava/net/HttpURLConnection;->disconnect()V
    invoke-virtual {v4, v3}, Ljava/io/File;->renameTo(Ljava/io/File;)Z
    move-result v10
    if-eqz v10, :cond_rename_error

    # Keep cache downloads private. Publish successful ordinary downloads to
    # the public Music/YM Liberty collection on Android 10+ (MediaStore).
    iget-boolean v10, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mToCache:Z
    if-nez v10, :cond_skip_publish
    iget-object v10, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mContext:Landroid/content/Context;
    iget-object v11, p0, Lcom/ymliberty/app/TrackDownloadRunnable;->mFileName:Ljava/lang/String;
    invoke-static {v10, v3, v11}, Lcom/ymliberty/app/TrackDownloadPublisher;->publish(Landroid/content/Context;Ljava/io/File;Ljava/lang/String;)Z
    :cond_skip_publish

    const/16 v10, 0x64
    const/4 v11, 0x1
    const/4 v12, 0x0
    invoke-direct {p0, v10, v11, v12}, Lcom/ymliberty/app/TrackDownloadRunnable;->notifyProgress(IZLjava/lang/String;)V

    new-instance v10, Ljava/lang/StringBuilder;
    const-string v11, "native download success bytes="
    invoke-direct {v10, v11}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V
    invoke-virtual {v10, v8, v9}, Ljava/lang/StringBuilder;->append(J)Ljava/lang/StringBuilder;
    const-string v11, " file="
    invoke-virtual {v10, v11}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v3}, Ljava/io/File;->getAbsolutePath()Ljava/lang/String;
    move-result-object v11
    invoke-virtual {v10, v11}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v10}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v10
    invoke-direct {p0, v10}, Lcom/ymliberty/app/TrackDownloadRunnable;->log(Ljava/lang/String;)V
    return-void

    :cond_no_dir
    new-instance v3, Ljava/io/IOException;
    const-string v4, "download directory unavailable"
    invoke-direct {v3, v4}, Ljava/io/IOException;-><init>(Ljava/lang/String;)V
    throw v3

    :cond_rename_error
    new-instance v3, Ljava/io/IOException;
    const-string v4, "download rename failed"
    invoke-direct {v3, v4}, Ljava/io/IOException;-><init>(Ljava/lang/String;)V
    throw v3

    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    move-exception v1
    invoke-virtual {v1}, Ljava/lang/Throwable;->getMessage()Ljava/lang/String;
    move-result-object v2
    if-nez v2, :cond_error_log
    const-string v2, "unknown native download error"
    :cond_error_log
    const/4 v3, 0x0
    const/4 v4, 0x1
    invoke-direct {p0, v3, v4, v2}, Lcom/ymliberty/app/TrackDownloadRunnable;->notifyProgress(IZLjava/lang/String;)V
    invoke-direct {p0, v2}, Lcom/ymliberty/app/TrackDownloadRunnable;->log(Ljava/lang/String;)V
    return-void
.end method
