.class public final Lcom/ymliberty/app/AudioOutputDeviceCallback;
.super Landroid/media/AudioDeviceCallback;
.source "AudioOutputDeviceCallback.java"

.method public constructor <init>()V
    .registers 1
    invoke-direct {p0}, Landroid/media/AudioDeviceCallback;-><init>()V
    return-void
.end method

.method private isHeadphoneOutput(Landroid/media/AudioDeviceInfo;)Z
    .registers 4
    invoke-virtual {p1}, Landroid/media/AudioDeviceInfo;->isSink()Z
    move-result v0
    if-eqz v0, :cond_no

    invoke-virtual {p1}, Landroid/media/AudioDeviceInfo;->getType()I
    move-result v0
    const/4 v1, 0x3
    if-eq v0, v1, :cond_yes
    const/4 v1, 0x4
    if-eq v0, v1, :cond_yes
    const/16 v1, 0x8
    if-eq v0, v1, :cond_yes
    const/16 v1, 0x16
    if-eq v0, v1, :cond_yes
    const/16 v1, 0x17
    if-eq v0, v1, :cond_yes
    const/16 v1, 0x1a
    if-eq v0, v1, :cond_yes
    :cond_no
    const/4 v0, 0x0
    return v0
    :cond_yes
    const/4 v0, 0x1
    return v0
.end method

.method public onAudioDevicesAdded([Landroid/media/AudioDeviceInfo;)V
    .registers 6
    if-eqz p1, :cond_exit
    array-length v0, p1
    const/4 v1, 0x0
    :loop
    if-ge v1, v0, :cond_exit
    aget-object v2, p1, v1
    invoke-direct {p0, v2}, Lcom/ymliberty/app/AudioOutputDeviceCallback;->isHeadphoneOutput(Landroid/media/AudioDeviceInfo;)Z
    move-result v3
    if-eqz v3, :cond_next
    invoke-static {}, Lcom/ymliberty/app/MediaPlaybackService;->onAudioOutputConnected()V
    return-void
    :cond_next
    add-int/lit8 v1, v1, 0x1
    goto :loop
    :cond_exit
    return-void
.end method

.method public onAudioDevicesRemoved([Landroid/media/AudioDeviceInfo;)V
    .registers 2
    return-void
.end method
