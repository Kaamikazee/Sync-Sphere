import * as React from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Divider from "@mui/material/Divider";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import { Group } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";

interface Props {
  group: Group;
  href: string
}
export default function GroupComp({
  group: { id, image, name, /* color, */ createdAt }, href
}: Props) {
 return (
    <Link href={`${href}/${id}`}>
      
        <div
          className="
            p-6
            bg-gradient-to-br
              from-purple-500/40
              via-blue-400/40
              to-indigo-500/40
            backdrop-blur-md
            border border-white/25
            shadow-xl
            flex justify-center
            hover:shadow-2xl hover:scale-105
            transition-transform duration-300
          "
        >
          <List
            className="
              w-full max-w-md
              bg-white/10 backdrop-blur-md
              rounded-2xl overflow-hidden
              border border-white/20
              shadow-md
            "
          >
            <ListItem
              alignItems="flex-start"
              className="
                flex items-start gap-4
                p-5 transition-colors
                hover:bg-white/10
              "
            >
              <ListItemAvatar>
                <Avatar
                  alt={name}
                  src={image}
                  className="ring-2 ring-white/50"
                />
              </ListItemAvatar>
              <ListItemText
                primary={
                  <span className="text-white text-lg font-semibold">
                    {name}
                  </span>
                }
                secondary={
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-white/90">Ali Connors</span>
                    <span className="text-white/80 font-mono">
                      {format(createdAt, "yyyy-MM-dd")}
                    </span>
                  </div>
                }
              />
            </ListItem>
            <Divider
              variant="inset"
              component="li"
              className="border-white/30"
            />
          </List>
        </div>
      
    </Link>
  );
}
