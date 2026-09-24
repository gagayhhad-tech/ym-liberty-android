.class public final Lcom/ymliberty/app/TrackDownloadProgressRunnable;
.super Ljava/lang/Object;
.implements Ljava/lang/Runnable;
.source "TrackDownloadProgressRunnable.java"

.field private final mError:Ljava/lang/String;
.field private final mFileName:Ljava/lang/String;
.field private final mPercent:I
.field private final mDone:Z
.field private final mWebView:Landroid/webkit/WebView;

.method public constructor <init>(Landroid/webkit/WebView;Ljava/lang/String;IZLjava/lang/String;)V
    .registers 6
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V
    iput-object p1, p0, Lcom/ymliberty/app/TrackDownloadProgressRunnable;->mWebView:Landroid/webkit/WebView;
    iput-object p2, p0, Lcom/ymliberty/app/TrackDownloadProgressRunnable;->mFileName:Ljava/lang/String;
    iput p3, p0, Lcom/ymliberty/app/TrackDownloadProgressRunnable;->mPercent:I
    iput-boolean p4, p0, Lcom/ymliberty/app/TrackDownloadProgressRunnable;->mDone:Z
    iput-object p5, p0, Lcom/ymliberty/app/TrackDownloadProgressRunnable;->mError:Ljava/lang/String;
    return-void
.end method

.method public run()V
    .registers 8
    iget-object v0, p0, Lcom/ymliberty/app/TrackDownloadProgressRunnable;->mWebView:Landroid/webkit/WebView;
    if-eqz v0, :cond_exit

    iget-object v1, p0, Lcom/ymliberty/app/TrackDownloadProgressRunnable;->mFileName:Ljava/lang/String;
    invoke-static {v1}, Lorg/json/JSONObject;->quote(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v1
    iget v2, p0, Lcom/ymliberty/app/TrackDownloadProgressRunnable;->mPercent:I
    iget-boolean v3, p0, Lcom/ymliberty/app/TrackDownloadProgressRunnable;->mDone:Z
    iget-object v4, p0, Lcom/ymliberty/app/TrackDownloadProgressRunnable;->mError:Ljava/lang/String;

    new-instance v5, Ljava/lang/StringBuilder;
    const-string v0, "if(window.onTrackDownloadProgress){window.onTrackDownloadProgress("
    invoke-direct {v5, v0}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V
    invoke-virtual {v5, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    const-string v0, ","
    invoke-virtual {v5, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v5, v2}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;
    const-string v0, ","
    invoke-virtual {v5, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v5, v3}, Ljava/lang/StringBuilder;->append(Z)Ljava/lang/StringBuilder;
    const-string v0, ","
    invoke-virtual {v5, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    if-eqz v4, :cond_null
    invoke-static {v4}, Lorg/json/JSONObject;->quote(Ljava/lang/String;)Ljava/lang/String;
    move-result-object v0
    invoke-virtual {v5, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    goto :cond_end_error
    :cond_null
    const-string v0, "null"
    invoke-virtual {v5, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    :cond_end_error
    const-string v0, ");}"
    invoke-virtual {v5, v0}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v5}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v1

    iget-object v0, p0, Lcom/ymliberty/app/TrackDownloadProgressRunnable;->mWebView:Landroid/webkit/WebView;
    const/4 v2, 0x0
    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V

    :cond_exit
    return-void
.end method
