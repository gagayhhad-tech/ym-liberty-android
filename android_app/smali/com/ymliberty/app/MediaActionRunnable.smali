.class public Lcom/ymliberty/app/MediaActionRunnable;
.super Ljava/lang/Object;
.implements Ljava/lang/Runnable;
.source "MediaActionRunnable.java"

# instance fields
.field private final mAction:Ljava/lang/String;
.field private final mWebView:Landroid/webkit/WebView;

# direct methods
.method public constructor <init>(Landroid/webkit/WebView;Ljava/lang/String;)V
    .registers 3

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/ymliberty/app/MediaActionRunnable;->mWebView:Landroid/webkit/WebView;

    iput-object p2, p0, Lcom/ymliberty/app/MediaActionRunnable;->mAction:Ljava/lang/String;

    return-void
.end method

# virtual methods
.method public run()V
    .registers 5

    iget-object v0, p0, Lcom/ymliberty/app/MediaActionRunnable;->mWebView:Landroid/webkit/WebView;

    if-eqz v0, :cond_exit

    new-instance v1, Ljava/lang/StringBuilder;

    invoke-direct {v1}, Ljava/lang/StringBuilder;-><init>()V

    const-string v2, "if (window.handleMediaAction) { window.handleMediaAction('"

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    iget-object v2, p0, Lcom/ymliberty/app/MediaActionRunnable;->mAction:Ljava/lang/String;

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    const-string v2, "'); }"

    invoke-virtual {v1, v2}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;

    invoke-virtual {v1}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;

    move-result-object v1

    const/4 v2, 0x0

    invoke-virtual {v0, v1, v2}, Landroid/webkit/WebView;->evaluateJavascript(Ljava/lang/String;Landroid/webkit/ValueCallback;)V

    :cond_exit
    return-void
.end method
