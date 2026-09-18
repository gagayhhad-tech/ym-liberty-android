.class Lcom/ymliberty/app/MediaPlaybackService$IdleShutdownRunnable;
.super Ljava/lang/Object;
.implements Ljava/lang/Runnable;
.source "MediaPlaybackService.java"

# instance fields
.field final synthetic this$0:Lcom/ymliberty/app/MediaPlaybackService;

# direct methods
.method constructor <init>(Lcom/ymliberty/app/MediaPlaybackService;)V
    .registers 2

    # super() MUST run before touching `this`: storing into a field of an
    # uninitialized instance is a verifier error (VerifyError at class load),
    # which crashed the app as soon as the service tried to arm this runnable.
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/ymliberty/app/MediaPlaybackService$IdleShutdownRunnable;->this$0:Lcom/ymliberty/app/MediaPlaybackService;

    return-void
.end method

# virtual methods
.method public run()V
    .registers 4

    :try_start_0
    iget-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService$IdleShutdownRunnable;->this$0:Lcom/ymliberty/app/MediaPlaybackService;

    if-nez v0, :cond_check

    return-void

    :cond_check
    # If playback resumed in the meantime, do nothing.
    invoke-static {v0}, Lcom/ymliberty/app/MediaPlaybackService;->access$isPlaying(Lcom/ymliberty/app/MediaPlaybackService;)Z

    move-result v1

    if-eqz v1, :cond_shutdown

    return-void

    :cond_shutdown
    invoke-static {v0}, Lcom/ymliberty/app/MediaPlaybackService;->access$stopIdle(Lcom/ymliberty/app/MediaPlaybackService;)V
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    return-void
.end method