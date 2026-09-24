.class public final Lcom/ymliberty/app/TrackDownloadPublisher;
.super Ljava/lang/Object;
.source "TrackDownloadPublisher.java"

.method public static publish(Landroid/content/Context;Ljava/io/File;Ljava/lang/String;)Z
    .registers 16

    const/4 v1, 0x0
    const/4 v3, 0x0
    :try_start_publish
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I
    const/16 v4, 0x1d
    if-lt v0, v4, :cond_publish_no

    invoke-virtual {p0}, Landroid/content/Context;->getContentResolver()Landroid/content/ContentResolver;
    move-result-object v1
    new-instance v2, Landroid/content/ContentValues;
    invoke-direct {v2}, Landroid/content/ContentValues;-><init>()V
    const-string v4, "display_name"
    invoke-virtual {v2, v4, p2}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V

    const-string v4, ".flac"
    invoke-virtual {p2, v4}, Ljava/lang/String;->endsWith(Ljava/lang/String;)Z
    move-result v4
    if-eqz v4, :cond_publish_mp3
    const-string v4, "audio/flac"
    goto :cond_publish_mime
    :cond_publish_mp3
    const-string v4, "audio/mpeg"
    :cond_publish_mime
    const-string v5, "mime_type"
    invoke-virtual {v2, v5, v4}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V
    const-string v5, "relative_path"
    const-string v6, "Music/YM Liberty/"
    invoke-virtual {v2, v5, v6}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/String;)V
    const-string v5, "is_pending"
    const/4 v6, 0x1
    invoke-static {v6}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;
    move-result-object v6
    invoke-virtual {v2, v5, v6}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/Integer;)V

    sget-object v4, Landroid/provider/MediaStore$Audio$Media;->EXTERNAL_CONTENT_URI:Landroid/net/Uri;
    invoke-virtual {v1, v4, v2}, Landroid/content/ContentResolver;->insert(Landroid/net/Uri;Landroid/content/ContentValues;)Landroid/net/Uri;
    move-result-object v3
    if-eqz v3, :cond_publish_no

    new-instance v5, Ljava/io/FileInputStream;
    invoke-direct {v5, p1}, Ljava/io/FileInputStream;-><init>(Ljava/io/File;)V
    invoke-virtual {v1, v3}, Landroid/content/ContentResolver;->openOutputStream(Landroid/net/Uri;)Ljava/io/OutputStream;
    move-result-object v6
    if-eqz v6, :cond_publish_io_error
    const/16 v7, 0x4000
    new-array v7, v7, [B

    :loop_publish_copy
    invoke-virtual {v5, v7}, Ljava/io/InputStream;->read([B)I
    move-result v8
    const/4 v9, -0x1
    if-ne v8, v9, :cond_publish_write
    invoke-virtual {v6}, Ljava/io/OutputStream;->flush()V
    invoke-virtual {v6}, Ljava/io/OutputStream;->close()V
    invoke-virtual {v5}, Ljava/io/InputStream;->close()V

    new-instance v10, Landroid/content/ContentValues;
    invoke-direct {v10}, Landroid/content/ContentValues;-><init>()V
    const-string v11, "is_pending"
    const/4 v12, 0x0
    invoke-static {v12}, Ljava/lang/Integer;->valueOf(I)Ljava/lang/Integer;
    move-result-object v12
    invoke-virtual {v10, v11, v12}, Landroid/content/ContentValues;->put(Ljava/lang/String;Ljava/lang/Integer;)V
    const/4 v11, 0x0
    const/4 v12, 0x0
    invoke-virtual {v1, v3, v10, v11, v12}, Landroid/content/ContentResolver;->update(Landroid/net/Uri;Landroid/content/ContentValues;Ljava/lang/String;[Ljava/lang/String;)I
    move-result v11
    if-lez v11, :cond_publish_update_error
    const/4 v0, 0x1
    return v0

    :cond_publish_write
    const/4 v9, 0x0
    invoke-virtual {v6, v7, v9, v8}, Ljava/io/OutputStream;->write([BII)V
    goto :loop_publish_copy

    :cond_publish_io_error
    new-instance v0, Ljava/io/IOException;
    const-string v4, "MediaStore output stream unavailable"
    invoke-direct {v0, v4}, Ljava/io/IOException;-><init>(Ljava/lang/String;)V
    throw v0

    :cond_publish_update_error
    new-instance v0, Ljava/io/IOException;
    const-string v4, "MediaStore item could not be published"
    invoke-direct {v0, v4}, Ljava/io/IOException;-><init>(Ljava/lang/String;)V
    throw v0

    :try_end_publish
    .catch Ljava/lang/Throwable; {:try_start_publish .. :try_end_publish} :catch_publish

    :catch_publish
    move-exception v0
    if-eqz v3, :cond_publish_no
    :try_start_cleanup
    const/4 v4, 0x0
    invoke-virtual {v1, v3, v4, v4}, Landroid/content/ContentResolver;->delete(Landroid/net/Uri;Ljava/lang/String;[Ljava/lang/String;)I
    :try_end_cleanup
    .catch Ljava/lang/Throwable; {:try_start_cleanup .. :try_end_cleanup} :catch_publish_cleanup
    :catch_publish_cleanup
    const/4 v0, 0x0
    return v0

    :cond_publish_no
    const/4 v0, 0x0
    return v0
.end method
