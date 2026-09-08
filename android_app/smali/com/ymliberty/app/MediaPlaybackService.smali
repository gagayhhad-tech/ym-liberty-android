.class public Lcom/ymliberty/app/MediaPlaybackService;
.super Landroid/app/Service;
.source "MediaPlaybackService.java"

# static fields
.field public static sInstance:Lcom/ymliberty/app/MediaPlaybackService;

# instance fields
.field private mArtist:Ljava/lang/String;

.field private mCoverBitmap:Landroid/graphics/Bitmap;

.field private mCoverUrl:Ljava/lang/String;

.field private mDurationMs:J

.field private mIsPlaying:Z

.field private mMediaSession:Landroid/media/session/MediaSession;

.field private mPositionMs:J

.field private mTitle:Ljava/lang/String;

.field private mWakeLock:Landroid/os/PowerManager$WakeLock;

.field private mNoisyReceiver:Lcom/ymliberty/app/NoisyAudioReceiver;

# direct methods
.method public constructor <init>()V
    .registers 4

    invoke-direct {p0}, Landroid/app/Service;-><init>()V

    const-string v0, "YM Liberty"

    iput-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mTitle:Ljava/lang/String;

    const-string v0, "Яндекс Музыка"

    iput-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mArtist:Ljava/lang/String;

    const-string v0, ""

    iput-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mCoverUrl:Ljava/lang/String;

    const/4 v0, 0x0

    iput-boolean v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mIsPlaying:Z

    const-wide/16 v1, 0x0

    iput-wide v1, p0, Lcom/ymliberty/app/MediaPlaybackService;->mPositionMs:J

    iput-wide v1, p0, Lcom/ymliberty/app/MediaPlaybackService;->mDurationMs:J

    return-void
.end method

.method private startImmediateForeground()V
    .locals 5

    :try_start_imm
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x1a

    if-lt v0, v1, :cond_imm_pre_o

    const-string v0, "ym_media_channel_v3"

    const-string v1, "YM Liberty Media"

    const/4 v2, 0x2

    new-instance v3, Landroid/app/NotificationChannel;

    invoke-direct {v3, v0, v1, v2}, Landroid/app/NotificationChannel;-><init>(Ljava/lang/String;Ljava/lang/CharSequence;I)V

    const/4 v0, 0x0

    invoke-virtual {v3, v0}, Landroid/app/NotificationChannel;->setShowBadge(Z)V

    const-string v0, "notification"

    invoke-virtual {p0, v0}, Landroid/app/Service;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Landroid/app/NotificationManager;

    if-eqz v0, :cond_imm_builder

    invoke-virtual {v0, v3}, Landroid/app/NotificationManager;->createNotificationChannel(Landroid/app/NotificationChannel;)V

    :cond_imm_builder
    new-instance v0, Landroid/app/Notification$Builder;

    const-string v1, "ym_media_channel_v3"

    invoke-direct {v0, p0, v1}, Landroid/app/Notification$Builder;-><init>(Landroid/content/Context;Ljava/lang/String;)V

    goto :goto_imm_build

    :cond_imm_pre_o
    new-instance v0, Landroid/app/Notification$Builder;

    invoke-direct {v0, p0}, Landroid/app/Notification$Builder;-><init>(Landroid/content/Context;)V

    :goto_imm_build
    const v1, 0x01080038

    invoke-virtual {v0, v1}, Landroid/app/Notification$Builder;->setSmallIcon(I)Landroid/app/Notification$Builder;

    const-string v1, "YM Liberty"

    invoke-virtual {v0, v1}, Landroid/app/Notification$Builder;->setContentTitle(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    const-string v1, "Яндекс Музыка"

    invoke-virtual {v0, v1}, Landroid/app/Notification$Builder;->setContentText(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    const/4 v1, 0x1

    invoke-virtual {v0, v1}, Landroid/app/Notification$Builder;->setOngoing(Z)Landroid/app/Notification$Builder;

    invoke-virtual {v0}, Landroid/app/Notification$Builder;->build()Landroid/app/Notification;

    move-result-object v0

    sget v1, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v2, 0x1d

    if-lt v1, v2, :cond_imm_pre_q

    :try_start_imm_q
    const/16 v1, 0x3e9

    const/4 v2, 0x2

    invoke-virtual {p0, v1, v0, v2}, Landroid/app/Service;->startForeground(ILandroid/app/Notification;I)V

    goto :goto_imm_done
    :try_end_imm_q
    .catch Ljava/lang/Throwable; {:try_start_imm_q .. :try_end_imm_q} :catch_imm_q

    :catch_imm_q
    :cond_imm_pre_q
    const/16 v1, 0x3e9

    invoke-virtual {p0, v1, v0}, Landroid/app/Service;->startForeground(ILandroid/app/Notification;)V

    :goto_imm_done
    :try_end_imm
    .catch Ljava/lang/Throwable; {:try_start_imm .. :try_end_imm} :catch_imm

    :catch_imm
    return-void
.end method

.method private updateNotification()V
    .locals 12

    :try_start_0
    # 1. Update MediaSession
    iget-object v4, p0, Lcom/ymliberty/app/MediaPlaybackService;->mMediaSession:Landroid/media/session/MediaSession;

    if-eqz v4, :cond_skip_session

    new-instance v5, Landroid/media/session/PlaybackState$Builder;

    invoke-direct {v5}, Landroid/media/session/PlaybackState$Builder;-><init>()V

    # Actions: 0x337 includes ACTION_SEEK_TO (256) + standard playback
    const-wide/16 v6, 0x337

    invoke-virtual {v5, v6, v7}, Landroid/media/session/PlaybackState$Builder;->setActions(J)Landroid/media/session/PlaybackState$Builder;

    iget-boolean v6, p0, Lcom/ymliberty/app/MediaPlaybackService;->mIsPlaying:Z

    if-eqz v6, :cond_paused

    const/4 v6, 0x3

    const/high16 v9, 0x3f800000    # 1.0f speed

    goto :goto_state

    :cond_paused
    const/4 v6, 0x2

    const/4 v9, 0x0             # 0.0f speed

    :goto_state
    iget-wide v7, p0, Lcom/ymliberty/app/MediaPlaybackService;->mPositionMs:J

    invoke-virtual/range {v5 .. v9}, Landroid/media/session/PlaybackState$Builder;->setState(IJF)Landroid/media/session/PlaybackState$Builder;

    invoke-virtual {v5}, Landroid/media/session/PlaybackState$Builder;->build()Landroid/media/session/PlaybackState;

    move-result-object v5

    invoke-virtual {v4, v5}, Landroid/media/session/MediaSession;->setPlaybackState(Landroid/media/session/PlaybackState;)V

    new-instance v5, Landroid/media/MediaMetadata$Builder;

    invoke-direct {v5}, Landroid/media/MediaMetadata$Builder;-><init>()V

    const-string v6, "android.media.metadata.TITLE"

    iget-object v7, p0, Lcom/ymliberty/app/MediaPlaybackService;->mTitle:Ljava/lang/String;

    if-eqz v7, :cond_title

    invoke-virtual {v5, v6, v7}, Landroid/media/MediaMetadata$Builder;->putString(Ljava/lang/String;Ljava/lang/String;)Landroid/media/MediaMetadata$Builder;

    :cond_title
    const-string v6, "android.media.metadata.ARTIST"

    iget-object v7, p0, Lcom/ymliberty/app/MediaPlaybackService;->mArtist:Ljava/lang/String;

    if-eqz v7, :cond_artist

    invoke-virtual {v5, v6, v7}, Landroid/media/MediaMetadata$Builder;->putString(Ljava/lang/String;Ljava/lang/String;)Landroid/media/MediaMetadata$Builder;

    :cond_artist
    # Duration for seekbar
    const-string v6, "android.media.metadata.DURATION"

    iget-wide v7, p0, Lcom/ymliberty/app/MediaPlaybackService;->mDurationMs:J

    invoke-virtual {v5, v6, v7, v8}, Landroid/media/MediaMetadata$Builder;->putLong(Ljava/lang/String;J)Landroid/media/MediaMetadata$Builder;

    # Cover art bitmap
    iget-object v6, p0, Lcom/ymliberty/app/MediaPlaybackService;->mCoverBitmap:Landroid/graphics/Bitmap;

    if-eqz v6, :cond_no_bitmap

    const-string v7, "android.media.metadata.ALBUM_ART"

    invoke-virtual {v5, v7, v6}, Landroid/media/MediaMetadata$Builder;->putBitmap(Ljava/lang/String;Landroid/graphics/Bitmap;)Landroid/media/MediaMetadata$Builder;

    const-string v7, "android.media.metadata.ART"

    invoke-virtual {v5, v7, v6}, Landroid/media/MediaMetadata$Builder;->putBitmap(Ljava/lang/String;Landroid/graphics/Bitmap;)Landroid/media/MediaMetadata$Builder;

    :cond_no_bitmap
    invoke-virtual {v5}, Landroid/media/MediaMetadata$Builder;->build()Landroid/media/MediaMetadata;

    move-result-object v5

    invoke-virtual {v4, v5}, Landroid/media/session/MediaSession;->setMetadata(Landroid/media/MediaMetadata;)V

    :cond_skip_session
    # 2. Notification Channel
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x1a

    if-lt v0, v1, :cond_skip_channel

    const-string v0, "ym_media_channel_v3"

    const-string v1, "YM Liberty Media"

    const/4 v2, 0x2

    new-instance v11, Landroid/app/NotificationChannel;

    invoke-direct {v11, v0, v1, v2}, Landroid/app/NotificationChannel;-><init>(Ljava/lang/String;Ljava/lang/CharSequence;I)V

    const/4 v0, 0x0

    invoke-virtual {v11, v0}, Landroid/app/NotificationChannel;->setShowBadge(Z)V

    const/4 v0, 0x1

    invoke-virtual {v11, v0}, Landroid/app/NotificationChannel;->setLockscreenVisibility(I)V

    const-string v0, "notification"

    invoke-virtual {p0, v0}, Landroid/app/Service;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v10

    check-cast v10, Landroid/app/NotificationManager;

    if-eqz v10, :cond_skip_channel

    invoke-virtual {v10, v11}, Landroid/app/NotificationManager;->createNotificationChannel(Landroid/app/NotificationChannel;)V

    :cond_skip_channel
    # 3. PendingIntents
    new-instance v0, Landroid/content/Intent;

    const-class v1, Lcom/ymliberty/app/MainActivity;

    invoke-direct {v0, p0, v1}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    const/high16 v1, 0x14000000

    invoke-virtual {v0, v1}, Landroid/content/Intent;->setFlags(I)Landroid/content/Intent;

    const/4 v1, 0x0

    const/high16 v2, 0x4000000

    invoke-static {p0, v1, v0, v2}, Landroid/app/PendingIntent;->getActivity(Landroid/content/Context;ILandroid/content/Intent;I)Landroid/app/PendingIntent;

    move-result-object v0

    new-instance v1, Landroid/content/Intent;

    const-class v2, Lcom/ymliberty/app/MediaPlaybackService;

    invoke-direct {v1, p0, v2}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    const-string v2, "com.ymliberty.app.ACTION_PREV"

    invoke-virtual {v1, v2}, Landroid/content/Intent;->setAction(Ljava/lang/String;)Landroid/content/Intent;

    const/4 v2, 0x1

    const/high16 v3, 0x4000000

    invoke-static {p0, v2, v1, v3}, Landroid/app/PendingIntent;->getService(Landroid/content/Context;ILandroid/content/Intent;I)Landroid/app/PendingIntent;

    move-result-object v1

    new-instance v2, Landroid/content/Intent;

    const-class v3, Lcom/ymliberty/app/MediaPlaybackService;

    invoke-direct {v2, p0, v3}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    const-string v3, "com.ymliberty.app.ACTION_PLAY_PAUSE"

    invoke-virtual {v2, v3}, Landroid/content/Intent;->setAction(Ljava/lang/String;)Landroid/content/Intent;

    const/4 v3, 0x2

    const/high16 v4, 0x4000000

    invoke-static {p0, v3, v2, v4}, Landroid/app/PendingIntent;->getService(Landroid/content/Context;ILandroid/content/Intent;I)Landroid/app/PendingIntent;

    move-result-object v2

    new-instance v3, Landroid/content/Intent;

    const-class v4, Lcom/ymliberty/app/MediaPlaybackService;

    invoke-direct {v3, p0, v4}, Landroid/content/Intent;-><init>(Landroid/content/Context;Ljava/lang/Class;)V

    const-string v4, "com.ymliberty.app.ACTION_NEXT"

    invoke-virtual {v3, v4}, Landroid/content/Intent;->setAction(Ljava/lang/String;)Landroid/content/Intent;

    const/4 v4, 0x3

    const/high16 v5, 0x4000000

    invoke-static {p0, v4, v3, v5}, Landroid/app/PendingIntent;->getService(Landroid/content/Context;ILandroid/content/Intent;I)Landroid/app/PendingIntent;

    move-result-object v3

    # 4. Notification.Builder
    sget v4, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v5, 0x1a

    if-lt v4, v5, :cond_notif_pre_o

    new-instance v4, Landroid/app/Notification$Builder;

    const-string v5, "ym_media_channel_v3"

    invoke-direct {v4, p0, v5}, Landroid/app/Notification$Builder;-><init>(Landroid/content/Context;Ljava/lang/String;)V

    goto :goto_notif_builder

    :cond_notif_pre_o
    new-instance v4, Landroid/app/Notification$Builder;

    invoke-direct {v4, p0}, Landroid/app/Notification$Builder;-><init>(Landroid/content/Context;)V

    :goto_notif_builder
    new-instance v5, Landroid/app/Notification$MediaStyle;

    invoke-direct {v5}, Landroid/app/Notification$MediaStyle;-><init>()V

    iget-object v6, p0, Lcom/ymliberty/app/MediaPlaybackService;->mMediaSession:Landroid/media/session/MediaSession;

    if-eqz v6, :cond_skip_ms_token

    invoke-virtual {v6}, Landroid/media/session/MediaSession;->getSessionToken()Landroid/media/session/MediaSession$Token;

    move-result-object v6

    invoke-virtual {v5, v6}, Landroid/app/Notification$MediaStyle;->setMediaSession(Landroid/media/session/MediaSession$Token;)Landroid/app/Notification$MediaStyle;

    :cond_skip_ms_token
    const/4 v6, 0x3

    new-array v6, v6, [I

    fill-array-data v6, :array_compact

    invoke-virtual {v5, v6}, Landroid/app/Notification$MediaStyle;->setShowActionsInCompactView([I)Landroid/app/Notification$MediaStyle;

    invoke-virtual {v4, v5}, Landroid/app/Notification$Builder;->setStyle(Landroid/app/Notification$Style;)Landroid/app/Notification$Builder;

    iget-object v5, p0, Lcom/ymliberty/app/MediaPlaybackService;->mTitle:Ljava/lang/String;

    invoke-virtual {v4, v5}, Landroid/app/Notification$Builder;->setContentTitle(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    iget-object v5, p0, Lcom/ymliberty/app/MediaPlaybackService;->mArtist:Ljava/lang/String;

    invoke-virtual {v4, v5}, Landroid/app/Notification$Builder;->setContentText(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    const-string v5, "YM Liberty"

    invoke-virtual {v4, v5}, Landroid/app/Notification$Builder;->setSubText(Ljava/lang/CharSequence;)Landroid/app/Notification$Builder;

    # Small Icon: getIdentifier "ic_notification"
    invoke-virtual {p0}, Landroid/app/Service;->getResources()Landroid/content/res/Resources;

    move-result-object v5

    const-string v6, "ic_notification"

    const-string v7, "drawable"

    invoke-virtual {p0}, Landroid/app/Service;->getPackageName()Ljava/lang/String;

    move-result-object v8

    invoke-virtual {v5, v6, v7, v8}, Landroid/content/res/Resources;->getIdentifier(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)I

    move-result v5

    if-nez v5, :cond_small_icon

    const v5, 0x01080038

    :cond_small_icon
    invoke-virtual {v4, v5}, Landroid/app/Notification$Builder;->setSmallIcon(I)Landroid/app/Notification$Builder;

    # Large Icon: Cover Art
    iget-object v5, p0, Lcom/ymliberty/app/MediaPlaybackService;->mCoverBitmap:Landroid/graphics/Bitmap;

    if-eqz v5, :cond_skip_large_icon

    invoke-virtual {v4, v5}, Landroid/app/Notification$Builder;->setLargeIcon(Landroid/graphics/Bitmap;)Landroid/app/Notification$Builder;

    :cond_skip_large_icon
    invoke-virtual {v4, v0}, Landroid/app/Notification$Builder;->setContentIntent(Landroid/app/PendingIntent;)Landroid/app/Notification$Builder;

    const/4 v0, 0x1

    invoke-virtual {v4, v0}, Landroid/app/Notification$Builder;->setVisibility(I)Landroid/app/Notification$Builder;

    const/4 v0, 0x1

    invoke-virtual {v4, v0}, Landroid/app/Notification$Builder;->setOngoing(Z)Landroid/app/Notification$Builder;

    const/4 v0, 0x0

    invoke-virtual {v4, v0}, Landroid/app/Notification$Builder;->setShowWhen(Z)Landroid/app/Notification$Builder;

    const/4 v0, 0x1

    invoke-virtual {v4, v0}, Landroid/app/Notification$Builder;->setOnlyAlertOnce(Z)Landroid/app/Notification$Builder;

    # Action Prev
    invoke-virtual {p0}, Landroid/app/Service;->getResources()Landroid/content/res/Resources;

    move-result-object v5

    const-string v6, "ic_prev"

    const-string v7, "drawable"

    invoke-virtual {p0}, Landroid/app/Service;->getPackageName()Ljava/lang/String;

    move-result-object v8

    invoke-virtual {v5, v6, v7, v8}, Landroid/content/res/Resources;->getIdentifier(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)I

    move-result v5

    if-nez v5, :cond_has_prev_icon

    const v5, 0x0108003a

    :cond_has_prev_icon
    new-instance v6, Landroid/app/Notification$Action$Builder;

    const-string v7, "Previous"

    invoke-direct {v6, v5, v7, v1}, Landroid/app/Notification$Action$Builder;-><init>(ILjava/lang/CharSequence;Landroid/app/PendingIntent;)V

    invoke-virtual {v6}, Landroid/app/Notification$Action$Builder;->build()Landroid/app/Notification$Action;

    move-result-object v1

    invoke-virtual {v4, v1}, Landroid/app/Notification$Builder;->addAction(Landroid/app/Notification$Action;)Landroid/app/Notification$Builder;

    # Action Play/Pause
    invoke-virtual {p0}, Landroid/app/Service;->getResources()Landroid/content/res/Resources;

    move-result-object v5

    invoke-virtual {p0}, Landroid/app/Service;->getPackageName()Ljava/lang/String;

    move-result-object v6

    const-string v7, "drawable"

    iget-boolean v8, p0, Lcom/ymliberty/app/MediaPlaybackService;->mIsPlaying:Z

    if-eqz v8, :cond_ic_play

    const-string v8, "ic_pause"

    const-string v9, "Pause"

    goto :goto_pp_res

    :cond_ic_play
    const-string v8, "ic_play"

    const-string v9, "Play"

    :goto_pp_res
    invoke-virtual {v5, v8, v7, v6}, Landroid/content/res/Resources;->getIdentifier(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)I

    move-result v5

    if-nez v5, :cond_act_pp

    iget-boolean v5, p0, Lcom/ymliberty/app/MediaPlaybackService;->mIsPlaying:Z

    if-eqz v5, :cond_pp_play_fallback

    const v5, 0x01080037

    goto :cond_act_pp

    :cond_pp_play_fallback
    const v5, 0x01080038

    :cond_act_pp
    new-instance v6, Landroid/app/Notification$Action$Builder;

    invoke-direct {v6, v5, v9, v2}, Landroid/app/Notification$Action$Builder;-><init>(ILjava/lang/CharSequence;Landroid/app/PendingIntent;)V

    invoke-virtual {v6}, Landroid/app/Notification$Action$Builder;->build()Landroid/app/Notification$Action;

    move-result-object v2

    invoke-virtual {v4, v2}, Landroid/app/Notification$Builder;->addAction(Landroid/app/Notification$Action;)Landroid/app/Notification$Builder;

    # Action Next
    invoke-virtual {p0}, Landroid/app/Service;->getResources()Landroid/content/res/Resources;

    move-result-object v5

    const-string v6, "ic_next"

    const-string v7, "drawable"

    invoke-virtual {p0}, Landroid/app/Service;->getPackageName()Ljava/lang/String;

    move-result-object v8

    invoke-virtual {v5, v6, v7, v8}, Landroid/content/res/Resources;->getIdentifier(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)I

    move-result v5

    if-nez v5, :cond_has_next_icon

    const v5, 0x01080039

    :cond_has_next_icon
    new-instance v6, Landroid/app/Notification$Action$Builder;

    const-string v7, "Next"

    invoke-direct {v6, v5, v7, v3}, Landroid/app/Notification$Action$Builder;-><init>(ILjava/lang/CharSequence;Landroid/app/PendingIntent;)V

    invoke-virtual {v6}, Landroid/app/Notification$Action$Builder;->build()Landroid/app/Notification$Action;

    move-result-object v3

    invoke-virtual {v4, v3}, Landroid/app/Notification$Builder;->addAction(Landroid/app/Notification$Action;)Landroid/app/Notification$Builder;

    invoke-virtual {v4}, Landroid/app/Notification$Builder;->build()Landroid/app/Notification;

    move-result-object v0

    iget v1, v0, Landroid/app/Notification;->flags:I

    or-int/lit8 v1, v1, 0x22

    iput v1, v0, Landroid/app/Notification;->flags:I

    :try_start_fgs
    sget v1, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v2, 0x1d

    if-lt v1, v2, :cond_fgs_pre_q

    const/16 v1, 0x3e9

    const/4 v2, 0x2

    invoke-virtual {p0, v1, v0, v2}, Landroid/app/Service;->startForeground(ILandroid/app/Notification;I)V

    goto :goto_fgs_done

    :cond_fgs_pre_q
    const/16 v1, 0x3e9

    invoke-virtual {p0, v1, v0}, Landroid/app/Service;->startForeground(ILandroid/app/Notification;)V

    :goto_fgs_done
    :try_end_fgs
    .catch Ljava/lang/Throwable; {:try_start_fgs .. :try_end_fgs} :catch_fgs

    goto :goto_post_notif

    :catch_fgs
    :try_start_fgs_fallback
    const/16 v1, 0x3e9

    invoke-virtual {p0, v1, v0}, Landroid/app/Service;->startForeground(ILandroid/app/Notification;)V
    :try_end_fgs_fallback
    .catch Ljava/lang/Throwable; {:try_start_fgs_fallback .. :try_end_fgs_fallback} :catch_fgs_fallback

    :catch_fgs_fallback
    :goto_post_notif
    # Post via NotificationManager
    const-string v1, "notification"

    invoke-virtual {p0, v1}, Landroid/app/Service;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v1

    check-cast v1, Landroid/app/NotificationManager;

    if-eqz v1, :cond_exit

    const/16 v2, 0x3e9

    invoke-virtual {v1, v2, v0}, Landroid/app/NotificationManager;->notify(ILandroid/app/Notification;)V

    :cond_exit
    :try_end_0
    .catch Ljava/lang/Throwable; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    return-void

    :array_compact
    .array-data 4
        0x0
        0x1
        0x2
    .end array-data
.end method

# virtual methods
.method public onBind(Landroid/content/Intent;)Landroid/os/IBinder;
    .registers 3

    const/4 v0, 0x0

    return-object v0
.end method

.method public applyCoverBitmap(Landroid/graphics/Bitmap;)V
    .registers 2

    iput-object p1, p0, Lcom/ymliberty/app/MediaPlaybackService;->mCoverBitmap:Landroid/graphics/Bitmap;

    invoke-direct {p0}, Lcom/ymliberty/app/MediaPlaybackService;->updateNotification()V

    return-void
.end method

.method public onCoverLoaded(Landroid/graphics/Bitmap;)V
    .registers 5

    new-instance v0, Landroid/os/Handler;

    invoke-static {}, Landroid/os/Looper;->getMainLooper()Landroid/os/Looper;

    move-result-object v1

    invoke-direct {v0, v1}, Landroid/os/Handler;-><init>(Landroid/os/Looper;)V

    new-instance v1, Lcom/ymliberty/app/CoverUpdateRunnable;

    invoke-direct {v1, p0, p1}, Lcom/ymliberty/app/CoverUpdateRunnable;-><init>(Lcom/ymliberty/app/MediaPlaybackService;Landroid/graphics/Bitmap;)V

    invoke-virtual {v0, v1}, Landroid/os/Handler;->post(Ljava/lang/Runnable;)Z

    return-void
.end method

.method public onCreate()V
    .registers 4

    invoke-super {p0}, Landroid/app/Service;->onCreate()V

    sput-object p0, Lcom/ymliberty/app/MediaPlaybackService;->sInstance:Lcom/ymliberty/app/MediaPlaybackService;

    invoke-direct {p0}, Lcom/ymliberty/app/MediaPlaybackService;->startImmediateForeground()V

    :try_start_0
    const-string v0, "power"

    invoke-virtual {p0, v0}, Landroid/app/Service;->getSystemService(Ljava/lang/String;)Ljava/lang/Object;

    move-result-object v0

    check-cast v0, Landroid/os/PowerManager;

    if-eqz v0, :cond_18

    const/4 v1, 0x1

    const-string v2, "YMLiberty:AudioLock"

    invoke-virtual {v0, v1, v2}, Landroid/os/PowerManager;->newWakeLock(ILjava/lang/String;)Landroid/os/PowerManager$WakeLock;

    move-result-object v0

    iput-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mWakeLock:Landroid/os/PowerManager$WakeLock;

    if-eqz v0, :cond_18

    invoke-virtual {v0}, Landroid/os/PowerManager$WakeLock;->acquire()V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    :cond_18

    :try_start_icon
    invoke-virtual {p0}, Landroid/app/Service;->getResources()Landroid/content/res/Resources;

    move-result-object v0

    invoke-virtual {p0}, Landroid/app/Service;->getApplicationInfo()Landroid/content/pm/ApplicationInfo;

    move-result-object v1

    iget v1, v1, Landroid/content/pm/ApplicationInfo;->icon:I

    invoke-static {v0, v1}, Landroid/graphics/BitmapFactory;->decodeResource(Landroid/content/res/Resources;I)Landroid/graphics/Bitmap;

    move-result-object v0

    iput-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mCoverBitmap:Landroid/graphics/Bitmap;
    :try_end_icon
    .catch Ljava/lang/Exception; {:try_start_icon .. :try_end_icon} :catch_icon

    :catch_icon
    :try_start_1
    sget v0, Landroid/os/Build$VERSION;->SDK_INT:I

    const/16 v1, 0x15

    if-lt v0, v1, :cond_34

    new-instance v0, Landroid/media/session/MediaSession;

    const-string v1, "YMLiberty"

    invoke-direct {v0, p0, v1}, Landroid/media/session/MediaSession;-><init>(Landroid/content/Context;Ljava/lang/String;)V

    iput-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mMediaSession:Landroid/media/session/MediaSession;

    const/4 v1, 0x3

    invoke-virtual {v0, v1}, Landroid/media/session/MediaSession;->setFlags(I)V

    new-instance v1, Lcom/ymliberty/app/MediaSessionCallback;

    invoke-direct {v1}, Lcom/ymliberty/app/MediaSessionCallback;-><init>()V

    invoke-virtual {v0, v1}, Landroid/media/session/MediaSession;->setCallback(Landroid/media/session/MediaSession$Callback;)V

    const/4 v1, 0x1

    invoke-virtual {v0, v1}, Landroid/media/session/MediaSession;->setActive(Z)V
    :try_end_1
    .catch Ljava/lang/Exception; {:try_start_1 .. :try_end_1} :catch_1

    :catch_1
    :cond_34
    :try_start_noisy
    new-instance v0, Lcom/ymliberty/app/NoisyAudioReceiver;

    invoke-direct {v0}, Lcom/ymliberty/app/NoisyAudioReceiver;-><init>()V

    iput-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mNoisyReceiver:Lcom/ymliberty/app/NoisyAudioReceiver;

    new-instance v1, Landroid/content/IntentFilter;

    const-string v2, "android.media.AUDIO_BECOMING_NOISY"

    invoke-direct {v1, v2}, Landroid/content/IntentFilter;-><init>(Ljava/lang/String;)V

    invoke-virtual {p0, v0, v1}, Landroid/content/Context;->registerReceiver(Landroid/content/BroadcastReceiver;Landroid/content/IntentFilter;)Landroid/content/Intent;
    :try_end_noisy
    .catch Ljava/lang/Exception; {:try_start_noisy .. :try_end_noisy} :catch_noisy

    :catch_noisy
    :try_start_init_fgs
    invoke-direct {p0}, Lcom/ymliberty/app/MediaPlaybackService;->updateNotification()V
    :try_end_init_fgs
    .catch Ljava/lang/Throwable; {:try_start_init_fgs .. :try_end_init_fgs} :catch_init_fgs

    :catch_init_fgs
    return-void
.end method

.method public onDestroy()V
    .registers 3

    iget-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mNoisyReceiver:Lcom/ymliberty/app/NoisyAudioReceiver;

    if-eqz v0, :cond_noisy_skip

    :try_start_noisy_unreg
    invoke-virtual {p0, v0}, Landroid/content/Context;->unregisterReceiver(Landroid/content/BroadcastReceiver;)V

    const/4 v0, 0x0

    iput-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mNoisyReceiver:Lcom/ymliberty/app/NoisyAudioReceiver;
    :try_end_noisy_unreg
    .catch Ljava/lang/Exception; {:try_start_noisy_unreg .. :try_end_noisy_unreg} :catch_noisy_unreg

    :catch_noisy_unreg
    :cond_noisy_skip
    iget-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mWakeLock:Landroid/os/PowerManager$WakeLock;

    if-eqz v0, :cond_d

    :try_start_0
    invoke-virtual {v0}, Landroid/os/PowerManager$WakeLock;->isHeld()Z

    move-result v0

    if-eqz v0, :cond_d

    iget-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mWakeLock:Landroid/os/PowerManager$WakeLock;

    invoke-virtual {v0}, Landroid/os/PowerManager$WakeLock;->release()V
    :try_end_0
    .catch Ljava/lang/Exception; {:try_start_0 .. :try_end_0} :catch_0

    :catch_0
    :cond_d

    iget-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mMediaSession:Landroid/media/session/MediaSession;

    if-eqz v0, :cond_1c

    :try_start_1
    const/4 v1, 0x0

    invoke-virtual {v0, v1}, Landroid/media/session/MediaSession;->setActive(Z)V

    iget-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mMediaSession:Landroid/media/session/MediaSession;

    invoke-virtual {v0}, Landroid/media/session/MediaSession;->release()V
    :try_end_1
    .catch Ljava/lang/Exception; {:try_start_1 .. :try_end_1} :catch_1

    :catch_1
    :cond_1c
    const/4 v0, 0x0

    sput-object v0, Lcom/ymliberty/app/MediaPlaybackService;->sInstance:Lcom/ymliberty/app/MediaPlaybackService;

    invoke-super {p0}, Landroid/app/Service;->onDestroy()V

    return-void
.end method

.method public onStartCommand(Landroid/content/Intent;II)I
    .registers 9

    if-eqz p1, :cond_71

    invoke-virtual {p1}, Landroid/content/Intent;->getAction()Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_71

    const-string v1, "com.ymliberty.app.ACTION_UPDATE"

    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_53

    const-string v0, "title"

    invoke-virtual {p1, v0}, Landroid/content/Intent;->getStringExtra(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_1a

    iput-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mTitle:Ljava/lang/String;

    :cond_1a
    const-string v0, "artist"

    invoke-virtual {p1, v0}, Landroid/content/Intent;->getStringExtra(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_24

    iput-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mArtist:Ljava/lang/String;

    :cond_24
    const-string v0, "isPlaying"

    const/4 v1, 0x0

    invoke-virtual {p1, v0, v1}, Landroid/content/Intent;->getBooleanExtra(Ljava/lang/String;Z)Z

    move-result v0

    iput-boolean v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mIsPlaying:Z

    const-string v0, "positionMs"

    const/4 v1, 0x0

    invoke-virtual {p1, v0, v1}, Landroid/content/Intent;->getIntExtra(Ljava/lang/String;I)I

    move-result v0

    int-to-long v0, v0

    iput-wide v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mPositionMs:J

    const-string v0, "durationMs"

    const/4 v1, 0x0

    invoke-virtual {p1, v0, v1}, Landroid/content/Intent;->getIntExtra(Ljava/lang/String;I)I

    move-result v0

    int-to-long v0, v0

    iput-wide v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mDurationMs:J

    const-string v0, "coverUrl"

    invoke-virtual {p1, v0}, Landroid/content/Intent;->getStringExtra(Ljava/lang/String;)Ljava/lang/String;

    move-result-object v0

    if-eqz v0, :cond_4f

    iget-object v1, p0, Lcom/ymliberty/app/MediaPlaybackService;->mCoverUrl:Ljava/lang/String;

    invoke-virtual {v0, v1}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-nez v1, :cond_4f

    iput-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mCoverUrl:Ljava/lang/String;

    new-instance v1, Ljava/lang/Thread;

    new-instance v2, Lcom/ymliberty/app/CoverLoaderRunnable;

    invoke-direct {v2, p0, v0}, Lcom/ymliberty/app/CoverLoaderRunnable;-><init>(Lcom/ymliberty/app/MediaPlaybackService;Ljava/lang/String;)V

    invoke-direct {v1, v2}, Ljava/lang/Thread;-><init>(Ljava/lang/Runnable;)V

    invoke-virtual {v1}, Ljava/lang/Thread;->start()V

    :cond_4f
    invoke-direct {p0}, Lcom/ymliberty/app/MediaPlaybackService;->updateNotification()V

    const/4 v0, 0x1

    return v0

    :cond_53
    const-string v1, "com.ymliberty.app.ACTION_PLAY_PAUSE"

    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_63

    const-string v0, "play_pause"

    invoke-static {v0}, Lcom/ymliberty/app/MainActivity;->onMediaAction(Ljava/lang/String;)V

    iget-boolean v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mIsPlaying:Z

    xor-int/lit8 v0, v0, 0x1

    iput-boolean v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mIsPlaying:Z

    invoke-direct {p0}, Lcom/ymliberty/app/MediaPlaybackService;->updateNotification()V

    const/4 v0, 0x1

    return v0

    :cond_63
    const-string v1, "com.ymliberty.app.ACTION_NEXT"

    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v1

    if-eqz v1, :cond_72

    const-string v0, "next"

    invoke-static {v0}, Lcom/ymliberty/app/MainActivity;->onMediaAction(Ljava/lang/String;)V

    const/4 v0, 0x1

    return v0

    :cond_72
    const-string v1, "com.ymliberty.app.ACTION_PREV"

    invoke-virtual {v1, v0}, Ljava/lang/String;->equals(Ljava/lang/Object;)Z

    move-result v0

    if-eqz v0, :cond_71

    const-string v0, "prev"

    invoke-static {v0}, Lcom/ymliberty/app/MainActivity;->onMediaAction(Ljava/lang/String;)V

    const/4 v0, 0x1

    return v0

    :cond_71
    invoke-direct {p0}, Lcom/ymliberty/app/MediaPlaybackService;->updateNotification()V

    const/4 v0, 0x1

    return v0
.end method

.method public onSeek(J)V
    .locals 8

    iput-wide p1, p0, Lcom/ymliberty/app/MediaPlaybackService;->mPositionMs:J

    iget-object v0, p0, Lcom/ymliberty/app/MediaPlaybackService;->mMediaSession:Landroid/media/session/MediaSession;

    if-eqz v0, :cond_exit

    new-instance v1, Landroid/media/session/PlaybackState$Builder;

    invoke-direct {v1}, Landroid/media/session/PlaybackState$Builder;-><init>()V

    const-wide/16 v2, 0x337

    invoke-virtual {v1, v2, v3}, Landroid/media/session/PlaybackState$Builder;->setActions(J)Landroid/media/session/PlaybackState$Builder;

    iget-boolean v2, p0, Lcom/ymliberty/app/MediaPlaybackService;->mIsPlaying:Z

    if-eqz v2, :cond_paused

    const/4 v2, 0x3

    const/high16 v5, 0x3f800000    # 1.0f

    goto :goto_state

    :cond_paused
    const/4 v2, 0x2

    const/4 v5, 0x0

    :goto_state
    move-wide v3, p1

    invoke-virtual/range {v1 .. v5}, Landroid/media/session/PlaybackState$Builder;->setState(IJF)Landroid/media/session/PlaybackState$Builder;

    invoke-virtual {v1}, Landroid/media/session/PlaybackState$Builder;->build()Landroid/media/session/PlaybackState;

    move-result-object v1

    invoke-virtual {v0, v1}, Landroid/media/session/MediaSession;->setPlaybackState(Landroid/media/session/PlaybackState;)V

    :cond_exit
    return-void
.end method
