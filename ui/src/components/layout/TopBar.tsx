"use client";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Button,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
  Text,
  tokens,
} from "@fluentui/react-components";
import { SignOutRegular, PersonRegular, AlertRegular } from "@fluentui/react-icons";
import { useQuery } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users";
import styles from "./TopBar.module.css";

export function TopBar() {
  const router = useRouter();
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: usersApi.me });

  function logout() {
    localStorage.clear();
    router.push("/login");
  }

  return (
    <header className={styles.topbar}>
      <div className={styles.left}>
        <Text size={400} weight="semibold">
          DebDox
        </Text>
        <span className={styles.version}>v1.0</span>
      </div>
      <div className={styles.right}>
        <Button appearance="subtle" icon={<AlertRegular />} aria-label="Notifications" />
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Avatar
              name={me?.username ?? "User"}
              color="brand"
              style={{ cursor: "pointer" }}
            />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem icon={<PersonRegular />} disabled>
                {me?.username} ({me?.role})
              </MenuItem>
              <MenuItem icon={<SignOutRegular />} onClick={logout}>
                Sign out
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </div>
    </header>
  );
}
