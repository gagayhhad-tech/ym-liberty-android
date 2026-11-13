.class public Lcom/ymliberty/app/SystemNavRunnable;
.super Ljava/lang/Object;
.implements Ljava/lang/Runnable;
.source "SystemNavRunnable.java"


.field private final mActivity:Landroid/app/Activity;
.field private final mHide:Z

.method public constructor <init>(Landroid/app/Activity;Z)V
    .registers 3

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/ymliberty/app/SystemNavRunnable;->mActivity:Landroid/app/Activity;

    iput-boolean p2, p0, Lcom/ymliberty/app/SystemNavRunnable;->mHide:Z

    return-void
.end method

.method public run()V
    .registers 5

    :try_start_0
    iget-object v0, p0, Lcom/ymliberty/app/SystemNavRunnable;->mActivity:Landroid/app/Activity;

    if-eqz v0, :cond_exit

    invoke-virtual {v0}, Landroid/app/Activity;->getWindow()Landroid/view/Window;

    move-result-object v0

    if-eqz v0, :cond_exit

    iget-boolean v1, p0, Lcom/ymliberty/app/SystemNavRunnable;->mHide:Z

    sget v2, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v3, 0x1e

    if-lt v2, v3, :cond_legacy

    invoke-virtual {v0}, Landroid/view/Window;->getInsetsController()Landroid/view/WindowInsetsController;

    move-result-object v0

    if-eqz v0, :cond_exit

    invoke-static {}, Landroid/view/WindowInsets$Type;->navigationBars()I

    move-result v2

    if-eqz v1, :cond_show_30

    const/4 v3, 0x2

    invoke-interface {v0, v3}, Landroid/view/WindowInsetsController;->setSystemBarsBehavior(I)V

    invoke-interface {v0, v2}, Landroid/view/WindowInsetsController;->hide(I)V

    goto :cond_exit

    :cond_show_30
    invoke-interface {v0, v2}, Landroid/view/WindowInsetsController;->show(I)V

    goto :cond_exit

    :cond_legacy
    invoke-virtual {v0}, Landroid/view/Window;->getDecorView()Landroid/view/View;

    move-result-object v0

    if-eqz v0, :cond_exit

    const/4 v2, 0x0

    if-eqz v1, :cond_apply_legacy

    const/16 v2, 0x1302

    :cond_apply_legacy
    invoke-virtual {v0, v2}, Landroid/view/View;->setSystemUiVisibility(I)V
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    :cond_exit
    return-void
.end method
