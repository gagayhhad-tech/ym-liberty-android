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
    .registers 6

    if-eqz p2, :cond_exit

    invoke-virtual {p2}, Landroid/content/Intent;->getAction()Ljava/lang/String;

    move-result-object v0

    const-string v1, "android.media.AUDIO_BECOMING_NOISY"
    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v1
    if-eqz v1, :cond_wired
    invoke-static {}, Lcom/ymliberty/app/MediaPlaybackService;->onAudioOutputNoisy()V
    return-void

    :cond_wired
    const-string v1, "android.intent.action.HEADSET_PLUG"
    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v1
    if-eqz v1, :cond_bluetooth
    const-string v1, "state"
    const/4 v2, 0x0
    invoke-virtual {p2, v1, v2}, Landroid/content/Intent;->getIntExtra(Ljava/lang/String;I)I
    move-result v1
    if-eqz v1, :cond_exit
    invoke-static {}, Lcom/ymliberty/app/MediaPlaybackService;->onAudioOutputConnected()V
    return-void

    :cond_bluetooth
    const-string v1, "android.bluetooth.a2dp.profile.action.CONNECTION_STATE_CHANGED"
    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z
    move-result v1
    if-eqz v1, :cond_exit
    const-string v1, "android.bluetooth.profile.extra.STATE"
    const/4 v2, 0x0
    invoke-virtual {p2, v1, v2}, Landroid/content/Intent;->getIntExtra(Ljava/lang/String;I)I
    move-result v1
    const/4 v2, 0x2
    if-ne v1, v2, :cond_exit
    invoke-static {}, Lcom/ymliberty/app/MediaPlaybackService;->onAudioOutputConnected()V

    :cond_exit
    return-void
.end method
