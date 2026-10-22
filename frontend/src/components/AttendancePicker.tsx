import type { Member } from "@/lib/types";

type Props = {
  members: Member[];
  presentIds: number[];
  onChange: (presentIds: number[]) => void;
};

export function AttendancePicker({ members, presentIds, onChange }: Props) {
  function toggle(id: number, checked: boolean) {
    const next = new Set(presentIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    // keep member order so the request is stable
    onChange(members.filter((m) => next.has(m.id)).map((m) => m.id));
  }

  return (
    <fieldset className="rounded-xl border border-black/10 p-4 dark:border-white/15">
      <legend className="px-1 text-sm font-semibold">오늘 누가 있나요?</legend>
      <div className="flex flex-wrap gap-2">
        {members.map((member) => (
          <label
            key={member.id}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-black/15 px-3 py-1.5 has-[:checked]:border-amber-700 has-[:checked]:bg-amber-700 has-[:checked]:text-white dark:border-white/20"
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={presentIds.includes(member.id)}
              onChange={(e) => toggle(member.id, e.target.checked)}
            />
            {member.name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
