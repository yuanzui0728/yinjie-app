import type { FriendListItem } from "@yinjie/contracts";
import { getFriendDisplayName, matchesFriendSearch } from "./contact-utils";

export type ContactTagGroup = {
  tag: string;
  items: FriendListItem[];
};

export function buildContactTagGroups(
  friends: FriendListItem[],
  searchText: string,
): ContactTagGroup[] {
  const groups = new Map<string, FriendListItem[]>();

  for (const item of friends) {
    const tags =
      item.friendship.tags?.map((tag) => tag.trim()).filter(Boolean) ?? [];

    for (const tag of tags) {
      const currentItems = groups.get(tag) ?? [];
      currentItems.push(item);
      groups.set(tag, currentItems);
    }
  }

  const normalizedSearchText = searchText.trim().toLowerCase();

  return [...groups.entries()]
    .map(([tag, items]) => ({
      tag,
      items: [...items].sort((left, right) =>
        getFriendDisplayName(left).localeCompare(
          getFriendDisplayName(right),
          "zh-CN",
        ),
      ),
    }))
    .filter((group) => {
      if (!normalizedSearchText) {
        return true;
      }

      if (group.tag.toLowerCase().includes(normalizedSearchText)) {
        return true;
      }

      return group.items.some((item) =>
        matchesFriendSearch(item, normalizedSearchText),
      );
    })
    .sort((left, right) => left.tag.localeCompare(right.tag, "zh-CN"));
}
