import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { SlashCommandItem } from "./slashCommandExtension";

export interface SlashCommandListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export interface SlashCommandListHandle {
  onKeyDown: ({ event }: { event: KeyboardEvent }) => boolean;
}

export const SlashCommandList = forwardRef<SlashCommandListHandle, SlashCommandListProps>(
  ({ items, command }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = useMemo(
      () =>
        (index: number) => {
          const item = items[index];
          if (item) {
            command(item);
          }
        },
      [items, command]
    );

    const upHandler = useMemo(
      () =>
        () => {
          setSelectedIndex((current) => {
            const previous = current - 1;
            return previous < 0 ? Math.max(items.length - 1, 0) : previous;
          });
        },
      [items.length]
    );

    const downHandler = useMemo(
      () =>
        () => {
          setSelectedIndex((current) => {
            const next = current + 1;
            return next >= items.length ? 0 : next;
          });
        },
      [items.length]
    );

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const selected = container.querySelector<HTMLButtonElement>(
        `[data-index="${selectedIndex}"]`
      );
      selected?.scrollIntoView({ block: "nearest" });
    }, [selectedIndex]);

    useImperativeHandle(
      ref,
      () => ({
        onKeyDown: ({ event }) => {
          if (event.key === "ArrowUp") {
            upHandler();
            return true;
          }
          if (event.key === "ArrowDown") {
            downHandler();
            return true;
          }
          if (event.key === "Enter") {
            selectItem(selectedIndex);
            return true;
          }
          return false;
        },
      }),
      [downHandler, selectItem, selectedIndex, upHandler]
    );

    if (!items.length) {
      return (
        <div
          ref={containerRef}
          className="w-72 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-500 shadow-xl"
        >
          <p>No matches. Keep typing to search commands.</p>
        </div>
      );
    }

    return (
      <div
        ref={containerRef}
        className="max-h-80 w-72 overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-xl"
      >
        {items.map((item, index) => {
          const Icon = item.icon;
          const isActive = index === selectedIndex;
          return (
            <button
              key={item.title}
              type="button"
              data-index={index}
              onClick={() => selectItem(index)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition ${
                isActive
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              {Icon ? (
                <Icon className="h-4 w-4 text-neutral-500" />
              ) : (
                <span className="h-4 w-4" aria-hidden />
              )}
              <div className="flex flex-col text-sm">
                <span className="font-medium">{item.title}</span>
                {item.description ? (
                  <span className="text-xs text-neutral-400">{item.description}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);

SlashCommandList.displayName = "SlashCommandList";
