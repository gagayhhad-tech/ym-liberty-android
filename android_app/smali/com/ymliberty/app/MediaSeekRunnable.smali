.class public Lcom/ymliberty/app/MediaSeekRunnable;
.super Ljava/lang/Object;
.implements Ljava/lang/Runnable;
.source "MediaSeekRunnable.java"

# instance fields
.field private final mPosMs:J

.field private final mWebView:Landroid/webkit/WebView;

# direct methods
.method public constructor <init>(Landroid/webkit/WebView;J)V
    .registers 4

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/ymliberty/app/MediaSeekRunnable;->mWebView:Landroid/webkit/WebView;

    iput-wide p2, p0, Lcom/ymliberty/app/MediaSeekRunnable;->mPosMs:J

    return-void
.end method

# virtual methods
.method public run()V
    .registers 5

    iget-object v0, p0, Lcom/ymliberty/app/MediaSeekRunnable;->mWebView:Landroid/webkit/WebView;

    if-eqz v0, :cond_exit

    new-instance v1, Ljava/lang/StringBuilder;

    invoke-direct {v1}, Ljava/lang/StringBuilder;-><init>()V

    const-string v2, "if (window.handleMediaSeek) { window.handleMediaSeek("

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget-wide v2, p0, Lcom/ymliberty/app/MediaSeekRunnable;->mPosMs:J

    invoke-virtual {v1, v2, v3}, Ljava/lang/StringBuilder;->append(J)Ljava/lang/StringBuilder;

    const-string v2, "); }"

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v1

    const/4 v2, 0x0

    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V

    :cond_exit
    return-void
.end method
