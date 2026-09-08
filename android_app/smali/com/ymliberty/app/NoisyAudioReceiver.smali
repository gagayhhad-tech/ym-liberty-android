.class public Lcom/ymliberty/app/NoisyAudioReceiver;
.super Landroid/content/BroadcastReceiver;
.source "NoisyAudioReceiver.java"

# direct methods
.method public constructor <init>()V
    .registers 1

    invoke-direct {p0}, Landroid/content/BroadcastReceiver;-><init>()V

    return-void
.end method

# virtual methods
.method public onReceive(Landroid/content/Context;Landroid/content/Intent;)V
    .registers 5

    if-eqz p2, :cond_exit

    invoke-virtual {p2}, Landroid/content/Intent;->getAction()Ljava/lang/String;

    move-result-object v0

    const-string v1, "android.media.AUDIO_BECOMING_NOISY"

    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_exit

    const-string v0, "pause"

    invoke-static {v0}, Lcom/ymliberty/app/MainActivity;->onMediaAction(Ljava/lang/String;)V

    :cond_exit
    return-void
.end method
