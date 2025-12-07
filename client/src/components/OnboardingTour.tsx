import { useEffect, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { HelpCircle } from 'lucide-react';

interface TourStep {
    element: string;
    popover: {
        title: string;
        description: string;
        side?: 'top' | 'right' | 'bottom' | 'left';
        align?: 'start' | 'center' | 'end';
    };
}

interface OnboardingTourProps {
    tourKey: string;
    steps: TourStep[];
}

export function OnboardingTour({ tourKey, steps }: OnboardingTourProps) {
    const { user } = useAuth();
    const [hasSeenTour, setHasSeenTour] = useState(false);

    useEffect(() => {
        const key = `tour_seen_${tourKey}_${user?.id}`;
        const seen = localStorage.getItem(key);
        if (seen) {
            setHasSeenTour(true);
        } else {
            // Small delay to ensure UI is ready
            const timer = setTimeout(() => {
                startTour();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [tourKey, user?.id]);

    const startTour = () => {
        const driverObj = driver({
            showProgress: true,
            animate: true,
            steps: steps,
            onDestroyStarted: () => {
                if (!driverObj.hasNextStep() || confirm("Are you sure you want to stop the tour?")) {
                    driverObj.destroy();
                    const key = `tour_seen_${tourKey}_${user?.id}`;
                    localStorage.setItem(key, 'true');
                    setHasSeenTour(true);
                }
            },
        });

        driverObj.drive();
    };

    return (
        <Button
            variant="outline"
            size="icon"
            className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg hover:shadow-xl transition-all"
            onClick={startTour}
            title="Restart Tour"
        >
            <HelpCircle className="h-5 w-5" />
        </Button>
    );
}
