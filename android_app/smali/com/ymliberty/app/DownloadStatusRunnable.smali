.class public final Lcom/ymliberty/app/DownloadStatusRunnable;
.super Ljava/lang/Object;
.source "DownloadStatusRunnable.java"

# interfaces
.implements Ljava/lang/Runnable;

# instance fields
.field private final mContext:Landroid/content/Context;
.field private final mDownloadId:J
.field private mAttempts:I

# direct methods
.method public constructor <init>(Landroid/content/Context;J)V
    .registers 5

    invoke-direct {p0}, Ljava/lang/Object;-><init>()V

    iput-object p1, p0, Lcom/ymliberty/app/DownloadStatusRunnable;->mContext:Landroid/content/Context;
    iput-wide p2, p0, Lcom/ymliberty/app/DownloadStatusRunnable;->mDownloadId:J

    const/4 v0, 0x0
    iput v0, p0, Lcom/ymliberty/app/DownloadStatusRunnable;->mAttempts:I

    return-void
.end method

.method private logStatus(II)V
    .registers 6

    new-instance v0, Ljava/lang/StringBuilder;
    const-string v1, "track download status="
    invoke-direct {v0, v1}, Ljava/lang/StringBuilder;-><init>(Ljava/lang/String;)V
    invoke-virtual {v0, p1}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;
    const-string v1, " reason="
    invoke-virtual {v0, v1}, Ljava/lang/StringBuilder;->append(Ljava/lang/String;)Ljava/lang/StringBuilder;
    invoke-virtual {v0, p2}, Ljava/lang/StringBuilder;->append(I)Ljava/lang/StringBuilder;
    invoke-virtual {v0}, Ljava/lang/StringBuilder;->toString()Ljava/lang/String;
    move-result-object v0

    const-string v1, "DOWNLOAD"
    invoke-static {v1, v0}, Lcom/ymliberty/app/YMLogger;->log(Ljava/lang/String;Ljava/lang/String;)V
    return-void
.end method

.method public run()V
    .registers 10

    :try_start_0
    iget-object v0, p0, Lcom/ymliberty/app/DownloadStatusRunnable;->mContext:Landroid/content/Context;
    const-string v1, "download"
    invoke-virtual {v0, v1}, Landroid/content/Context;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;
    move-result-object v0
    check-cast v0, Landroid/app/DownloadManager;

    new-instance v1, Landroid/app/DownloadManager$Query;
    invoke-direct {v1}, Landroid/app/DownloadManager$Query;-><init>()V
    iget-wide v2, p0, Lcom/ymliberty/app/DownloadStatusRunnable;->mDownloadId:J
    invoke-virtual {v1, v2, v3}, Landroid/app/DownloadManager$Query;->setFilterById(J)Landroid/app/DownloadManager$Query;
    move-result-object v1
    invoke-virtual {v0, v1}, Landroid/app/DownloadManager;->query(Landroid/app/DownloadManager$Query;)Landroid/database/Cursor;
    move-result-object v0

    if-eqz v0, :cond_done
    invoke-interface {v0}, Landroid/database/Cursor;->moveToFirst()Z
    move-result v1
    if-eqz v1, :cond_close

    const-string v1, "status"
    invoke-interface {v0, v1}, Landroid/database/Cursor;->getColumnIndex(Ljava/lang/String;)I
    move-result v1
    invoke-interface {v0, v1}, Landroid/database/Cursor;->getInt(I)I
    move-result v2

    const-string v1, "reason"
    invoke-interface {v0, v1}, Landroid/database/Cursor;->getColumnIndex(Ljava/lang/String;)I
    move-result v1
    invoke-interface {v0, v1}, Landroid/database/Cursor;->getInt(I)I
    move-result v3

    invoke-interface {v0}, Landroid/database/Cursor;->close()V

    const/16 v4, 0x8
    if-ne v2, v4, :cond_not_success
    invoke-direct {p0, v2, v3}, Lcom/ymliberty/app/DownloadStatusRunnable;->logStatus(II)V
    return-void

    :cond_not_success
    const/16 v4, 0x10
    if-ne v2, v4, :cond_retry
    invoke-direct {p0, v2, v3}, Lcom/ymliberty/app/DownloadStatusRunnable;->logStatus(II)V
    return-void

    :cond_retry
    iget v1, p0, Lcom/ymliberty/app/DownloadStatusRunnable;->mAttempts:I
    const/16 v4, 0x1e
    if-ge v1, v4, :cond_timeout
    add-int/lit8 v1, v1, 0x1
    iput v1, p0, Lcom/ymliberty/app/DownloadStatusRunnable;->mAttempts:I

    new-instance v4, Landroid/os/Handler;
    invoke-static {}, Landroid/os/Looper;->getMainLooper()Landroid/os/Looper;
    move-result-object v5
    invoke-direct {v4, v5}, Landroid/os/Handler;-><init>(Landroid/os/Looper;)V
    const-wide/16 v5, 0x3e8
    invoke-virtual {v4, p0, v5, v6}, Landroid/os/Handler;->postDelayed(Ljava/lang/Runnable;J)Z
    return-void

    :cond_timeout
    const-string v1, "DOWNLOAD"
    const-string v2, "track download status polling timed out"
    invoke-static {v1, v2}, Lcom/ymliberty/app/YMLogger;->log(Ljava/lang/String;Ljava/lang/String;)V
    return-void

    :cond_close
    invoke-interface {v0}, Landroid/database/Cursor;->close()V
    :cond_done
    return-void

    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    move-exception v0
    const-string v1, "YMLiberty"
    const-string v2, "track download status query failed"
    invoke-static {v1, v2, v0}, Landroid/util/Log;->w(Ljava/lang/String;Ljava/lang/String;Ljava/lang/Throwable;)I
    return-void
.end method
