import { oz } from '@orpc/zod'
import { z } from 'zod'
import { UserSchema } from './user'

export type NewPlanet = z.infer<typeof NewPlanetSchema>
export type UpdatePlanet = z.infer<typeof UpdatePlanetSchema>
export type Planet = z.infer<typeof PlanetSchema>

export const NewPlanetSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  image: oz.file().type('image/*').optional(),
})

export const UpdatePlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
  image: oz.file().type('image/*').optional(),
})

export const PlanetSchema = z.object({
  id: z.number().int().min(1),
  name: z.string(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  creator: UserSchema,
})
