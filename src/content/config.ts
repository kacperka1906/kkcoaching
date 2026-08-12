import { defineCollection, z } from 'astro:content';

const services = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    order: z.number(),
    minor: z.boolean().default(false),
    ctaLabel: z.string(),
    ctaTarget: z.string().default('/contact'),
    image: z.string().default('/images/placeholder.png'),
    imageAlt: z.string(),
    bullets: z.array(z.string())
  })
});

const testimonials = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    namePl: z.string().optional(),
    ageDisclosed: z.boolean().default(false),
    age: z.number().optional(),
    serviceType: z.string(),
    serviceTypePl: z.string().optional(),
    duration: z.string(),
    durationPl: z.string().optional(),
    startingPoint: z.string(),
    startingPointPl: z.string().optional(),
    result: z.string(),
    resultPl: z.string().optional(),
    consentOnFile: z.boolean().default(false),
    image: z.string().default('/images/placeholder.png'),
    imageAlt: z.string(),
    imageAltPl: z.string().optional(),
    storyPl: z.string().optional(),
    featured: z.boolean().default(false)
  })
});

const faq = defineCollection({
  type: 'content',
  schema: z.object({
    question: z.string(),
    order: z.number(),
    language: z.enum(['en', 'pl']).default('en')
  })
});

export const collections = { services, testimonials, faq };
