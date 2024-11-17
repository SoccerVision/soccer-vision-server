import express, { Request, Response } from 'express';

import PartialUser from '../models/partialUser';
import User from '../models/user';
import { asyncHandler } from '../middleware/errorHandler';
import { validateEmailAvailability } from '../middleware/validateEmail';

const router = express.Router();

// Create a partial user (Step 1 of registration)
router.post(
    '/partial-users',
    validateEmailAvailability,
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const { email, password } = req.body;

        // Create a new PartialUser
        const partialUser = new PartialUser({ email, password, registrationStep: 1 });
        await partialUser.save();

        res.status(201).send(partialUser);
    })
);

// Complete registration (Step 2 of registration)
router.post(
    '/complete-registration',
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const { email, authProvider, passwordHash, username, nationality, teamName, referral } = req.body;

        // Check if a complete user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).send({ error: 'User already registered with this email' });
            return;
        }

        // Check if PartialUser exists
        const partialUser = await PartialUser.findOne({ email });
        if (!partialUser) {
            res.status(404).send({ error: 'Partial user not found' });
            return;
        }

        // Create a new User from the PartialUser
        const user = new User({
            email: partialUser.email,
            passwordHash: passwordHash || partialUser.password, // Use hashed password or original if not provided
            authProvider,
            username,
            nationality,
            teamName,
            referral,
            createdAt: partialUser.partialCreatedAt // Copy the partialCreatedAt field from the partial user
        });

        await user.save();

        // Remove the PartialUser document after successful registration
        await PartialUser.deleteOne({ email });

        res.status(201).send(user);
    })
);

export default router;