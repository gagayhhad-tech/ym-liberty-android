.class public Lcom/ymliberty/app/CoverLoaderRunnable;
.super Ljava/lang/Object;
.implements Ljava/lang/Runnable;
.source "CoverLoaderRunnable.java"

# instance fields
.field private final mService:Lcom/ymliberty/app/MediaPlaybackService;

.field private final mUrlString:Ljava/lang/String;

# direct methods
.method public constructor <init>(Lcom/ymliberty/app/MediaPlaybackService;Ljava/lang/String;)V
    .registers 3

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/ymliberty/app/CoverLoaderRunnable;->mService:Lcom/ymliberty/app/MediaPlaybackService;

    iput-object p2, p0, Lcom/ymliberty/app/CoverLoaderRunnable;->mUrlString:Ljava/lang/String;

    return-void
.end method

# virtual methods
.method public run()V
    .locals 5

    :try_start_0
    new-instance v0, Ljava/net/URL;

    iget-object v1, p0, Lcom/ymliberty/app/CoverLoaderRunnable;->mUrlString:Ljava/lang/String;

    invoke-direct {v0, v1}, Ljava/net/URL;-><init>(Ljava/lang/String;)V

    invoke-virtual {v0}, Ljava/net/URL;->openConnection()Ljava/net/URLConnection;

    move-result-object v0

    check-cast v0, Ljava/net/HttpURLConnection;

    const/16 v1, 0x1388

    invoke-virtual {v0, v1}, Ljava/net/HttpURLConnection;->setConnectTimeout(I)V

    invoke-virtual {v0, v1}, Ljava/net/HttpURLConnection;->setReadTimeout(I)V

    const/4 v1, 0x1

    invoke-virtual {v0, v1}, Ljava/net/HttpURLConnection;->setDoInput(Z)V

    invoke-virtual {v0}, Ljava/net/HttpURLConnection;->connect()V

    invoke-virtual {v0}, Ljava/net/HttpURLConnection;->getInputStream()Ljava/io/InputStream;

    move-result-object v1

    invoke-static {v1}, Landroid/graphics/BitmapFactory;->decodeStream(Ljava/io/InputStream;)Landroid/graphics/Bitmap;

    move-result-object v2

    invoke-virtual {v1}, Ljava/io/InputStream;->close()V

    invoke-virtual {v0}, Ljava/net/HttpURLConnection;->disconnect()V

    if-eqz v2, :cond_exit

    const/16 v3, 0x190

    const/4 v4, 0x1

    invoke-static {v2, v3, v3, v4}, Landroid/graphics/Bitmap;->createScaledBitmap(Landroid/graphics/Bitmap;IIZ)Landroid/graphics/Bitmap;

    move-result-object v2

    iget-object v0, p0, Lcom/ymliberty/app/CoverLoaderRunnable;->mService:Lcom/ymliberty/app/MediaPlaybackService;

    invoke-virtual {v0, v2}, Lcom/ymliberty/app/MediaPlaybackService;->onCoverLoaded(Landroid/graphics/Bitmap;)V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    :cond_exit
    return-void
.end method
