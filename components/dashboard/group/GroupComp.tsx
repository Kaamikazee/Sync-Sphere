import * as React from "react";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Divider from "@mui/material/Divider";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import { Group } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";

interface Props {
  group: Group;
  href: string
}
export default function GroupComp({
  group: { id, image, name, color, createdAt }, href
}: Props) {
  return (
      <Link href={`${href}/${id}`}>
    <div className="flex justify-center items-center w-full">
        <List
          sx={{ width: "100%", maxWidth: 360, bgcolor: "background.paper" }}
        >
          <ListItem alignItems="flex-start">
            <ListItemAvatar>
              <Avatar alt="Remy Sharp" src={image} />
            </ListItemAvatar>
            <ListItemText
              primary={name}
              secondary={
                <React.Fragment>
                  <div className="flex justify-between">
                    <div>
                      <Typography
                        component="span"
                        variant="body2"
                        sx={{ color: "text.primary", display: "inline" }}
                        className="mr-9"
                      >
                        Ali Connors{" "}
                      </Typography>
                    </div>
                    <div className="">{format(createdAt, "yyyy-MM-dd")}</div>
                  </div>
                </React.Fragment>
              }
            />
          </ListItem>
          <Divider variant="inset" component="li" />
        </List>
    </div>
      </Link>
  );
}
