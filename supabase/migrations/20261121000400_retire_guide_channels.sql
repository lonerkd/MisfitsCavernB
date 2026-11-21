-- L6 of the Lounge overhaul (BACKLOG 3.28): guides live in the hub's Learn (hub_posts, kind 'guide'), so the read-only "guide" channel type
-- is retired. The three seeded guide channels (start-here, faq, tutorials) were empty in production when this was written; this refuses to
-- run if any guide channel has a message, so nothing a person wrote can be lost, then removes the channels and the type.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.messages m JOIN public.channels c ON c.id = m.channel_uuid WHERE c.type = 'guide') THEN
    RAISE EXCEPTION 'A guide channel still has messages: move them to Learn (hub_posts kind guide) before retiring the type';
  END IF;
END $$;

DELETE FROM public.channels WHERE type = 'guide';
ALTER TABLE public.channels DROP CONSTRAINT channels_type_check;
ALTER TABLE public.channels ADD CONSTRAINT channels_type_check CHECK (type IN ('text', 'voice'));
