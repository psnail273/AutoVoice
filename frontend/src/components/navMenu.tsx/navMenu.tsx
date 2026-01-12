import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Playback from '../playback/playback';
import Rules from '../rules/rules';
import Options from '../options/options';

export default function NavMenu() {
  return (
    <Tabs defaultValue="rules">
      <TabsList className="w-full">
        <TabsTrigger className="" value="playback">Playback</TabsTrigger>
        <TabsTrigger className="" value="rules">Rules</TabsTrigger>
        <TabsTrigger className="" value="options">Options</TabsTrigger>
      </TabsList>
      <TabsContent className="flex pb-3 px-3 w-full" value="playback"><Playback /></TabsContent>
      <TabsContent className="flex pb-3 px-3 w-full" value="rules"><Rules /></TabsContent>
      <TabsContent className="flex pb-3 px-3 w-full" value="options"><Options /></TabsContent>
    </Tabs>);
}