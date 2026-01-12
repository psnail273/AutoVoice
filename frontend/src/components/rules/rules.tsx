'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useAudio } from '@/hooks/use-audio';

export default function Rules() {
  const { audio } = useAudio();

  return (
    <>
      {
        audio.hasAudio && (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Active Rule</CardTitle>
              <CardDescription>{ audio.website }</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="">
                test
              </div>
            </CardContent>
          </Card>
        ) }
    </>
  );
}