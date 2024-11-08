import { ReactNode, useState } from "react"

export type ItemType = {
    label: string,
    value: string,
    children?: ItemType
}

type NestedListProps = {
    buttonComponent: ReactNode,
    items: ItemType,
}

export default function NestedList(props: NestedListProps) {
    const [focused, setFocused] = useState(false);

    return (
        <div>
            <div onClick={() => setFocused(focused)}>
                {props.buttonComponent}
            </div>
        </div>
    )
}