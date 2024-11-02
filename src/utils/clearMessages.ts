export async function clearMessages(ctx: any) {
  for (const group of ctx.session.mediaGroupsMessage) {
    for (const message of group) {
      try {
        await ctx.deleteMessage(message.message_id);
      } catch {}
    }
  }
  for (const message of ctx.session.anyMessagesToDelete) {
    try {
      await ctx.deleteMessage(message.message_id);
    } catch {}
  }
  ctx.session.anyMessagesToDelete = [];
}
