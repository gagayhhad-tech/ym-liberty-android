.class public Lcom/ymliberty/app/CoverUpdateRunnable;
.super Ljava/lang/Object;
.implements Ljava/lang/Runnable;
.source "CoverUpdateRunnable.java"

# instance fields
.field private final mBitmap:Landroid/graphics/Bitmap;

.field private final mService:Lcom/ymliberty/app/MediaPlaybackService;

# direct methods
.method public constructor <init>(Lcom/ymliberty/app/MediaPlaybackService;Landroid/graphics/Bitmap;)V
    .registers 3

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/ymliberty/app/CoverUpdateRunnable;->mService:Lcom/ymliberty/app/MediaPlaybackService;

    iput-object p2, p0, Lcom/ymliberty/app/CoverUpdateRunnable;->mBitmap:Landroid/graphics/Bitmap;

    return-void
.end method

# virtual methods
.method public run()V
    .locals 3

    iget-object v0, p0, Lcom/ymliberty/app/CoverUpdateRunnable;->mService:Lcom/ymliberty/app/MediaPlaybackService;

    if-eqz v0, :cond_exit

    iget-object v1, p0, Lcom/ymliberty/app/CoverUpdateRunnable;->mBitmap:Landroid/graphics/Bitmap;

    invoke-virtual {v0, v1}, Lcom/ymliberty/app/MediaPlaybackService;->applyCoverBitmap(Landroid/graphics/Bitmap;)V

    :cond_exit
    return-void
.end method