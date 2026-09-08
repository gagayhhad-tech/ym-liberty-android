.class public Lcom/ymliberty/app/MediaSessionCallback;
.super Landroid/media/session/MediaSession$Callback;
.source "MediaSessionCallback.java"

# direct methods
.method public constructor <init>()V
    .registers 1

    invoke-direct {p0}, Landroid/media/session/MediaSession$Callback;-><init>()V

    return-void
.end method

# virtual methods
.method public onPause()V
    .registers 2

    const-string v0, "pause"

    invoke-static {v0}, Lcom/ymliberty/app/MainActivity;->onMediaAction(Ljava/lang/String;)V

    return-void
.end method

.method public onPlay()V
    .registers 2

    const-string v0, "play"

    invoke-static {v0}, Lcom/ymliberty/app/MainActivity;->onMediaAction(Ljava/lang/String;)V

    return-void
.end method

.method public onSeekTo(J)V
    .locals 1

    sget-object v0, Lcom/ymliberty/app/MediaPlaybackService;->sInstance:Lcom/ymliberty/app/MediaPlaybackService;

    if-eqz v0, :cond_skip

    invoke-virtual {v0, p1, p2}, Lcom/ymliberty/app/MediaPlaybackService;->onSeek(J)V

    :cond_skip
    invoke-static {p1, p2}, Lcom/ymliberty/app/MainActivity;->onMediaSeek(J)V

    return-void
.end method

.method public onSkipToNext()V
    .registers 2

    const-string v0, "next"

    invoke-static {v0}, Lcom/ymliberty/app/MainActivity;->onMediaAction(Ljava/lang/String;)V

    return-void
.end method

.method public onSkipToPrevious()V
    .registers 2

    const-string v0, "prev"

    invoke-static {v0}, Lcom/ymliberty/app/MainActivity;->onMediaAction(Ljava/lang/String;)V

    return-void
.end method
