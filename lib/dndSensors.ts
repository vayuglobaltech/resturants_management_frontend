import { PointerSensor } from '@dnd-kit/core';
import type { PointerEvent } from 'react';

export class MousePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: PointerEvent) => {
        if (
          event.pointerType !== 'mouse' ||
          !event.isPrimary ||
          event.button !== 0
        ) {
          return false;
        }
        return true;
      },
    },
  ];
}

export class TouchPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: PointerEvent) => {
        if (
          event.pointerType !== 'touch' ||
          !event.isPrimary ||
          event.button !== 0
        ) {
          return false;
        }
        return true;
      },
    },
  ];
}
