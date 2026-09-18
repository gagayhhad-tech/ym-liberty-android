.class public Lcom/ymliberty/app/AndroidBackCallback;
.super Ljava/lang/Object;
.implements Landroid/webkit/ValueCallback;
.source "AndroidBackCallback.java"

# instance fields
.field private final mActivity:Landroid/app/Activity;

# direct methods
.method public constructor <init>(Landroid/app/Activity;)V
    .registers 2

    # super() first — see the note in MediaPlaybackService$IdleShutdownRunnable.
    # Assigning a field before the superclass constructor runs is a VerifyError.
    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/ymliberty/app/AndroidBackCallback;->mActivity:Landroid/app/Activity;

    return-void
.end method

# virtual methods
# JS returns "true" when it consumed the back gesture (closed a modal, the full
# player, or navigated a view back). Anything else falls through to the default
# Activity behaviour.
.method public onReceiveValue(Ljava/lang/Object;)V
    .registers 4

    :try_start_0
    if-eqz p1, :cond_finish

    check-cast p1, Ljava/lang/String;

    invoke-virtual {p1}, Ljava/lang/String;->trim()Ljava/lang/String;

    move-result-object v0

    invoke-virtual {v0}, Ljava/lang/String;->toLowerCase()Ljava/lang/String;

    move-result-object v0

    const-string v1, "true"

    invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_finish

    return-void

    :cond_finish
    iget-object v0, p0, Lcom/ymliberty/app/AndroidBackCallback;->mActivity:Landroid/app/Activity;

    if-eqz v0, :cond_exit

    invoke-virtual {v0}, Landroid/app/Activity;->finish()V
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    :cond_exit
    return-void
.end method