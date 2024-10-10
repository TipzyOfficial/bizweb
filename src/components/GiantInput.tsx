import { Input as BaseInput, InputProps } from '@mui/base/Input';
import { TextareaAutosize } from '@mui/base/TextareaAutosize';
import { styled } from '@mui/system';
import React from 'react';
import { Colors, padding, radius } from '../lib/Constants';

export const Input = React.forwardRef(function CustomInput(
    props: InputProps & { focused?: boolean },
    ref: React.ForwardedRef<HTMLDivElement>,
) {
    const borderWidth = 2;

    // const [focused, setFocused] = React.useState(true);
    // const onFocus = props.onFocus;
    // const onBlur = props.onBlur;

    return (
        <div id={"outer"} style={{
            padding: borderWidth,
            borderRadius: radius
        }}
            className={props.focused ? "App-animated-gradient-light" : "App-animated-gradient"}
        >
            <div style={{
                width: (document.getElementById("outer")?.clientWidth ?? 0) - borderWidth * 2 - 1,
                borderRadius: radius - borderWidth,
                backgroundColor: Colors.background,
                overflow: 'hidden'
            }}>
                <BaseInput
                    slots={{
                        root: RootDiv,
                        input: 'input',
                        textarea: TextareaElement,
                    }}
                    style={{ borderRadius: radius }}
                    ref={ref}
                    {...props}
                />
            </div>
        </div>
    );
});

const RootDiv = styled('div')`
    display: flex;
    max-width: 100%;
  `;

const TextareaElement = styled(TextareaAutosize)(
    ({ theme }) => `
    width: 100%;
    resize: none;
    padding: ${padding}px;
    border-width: 0;
    border-radius: 0;
    color: ${"white"};
    background: ${Colors.background};
    box-shadow: 0px 2px 4px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0, 0.5)' : 'rgba(0,0,0, 0.05)'
        };
  
    &:hover {
      box-shadow: 0 0 3px ${"#fff8"};
    }
  
    &:focus {
      box-shadow: 0 0 3px ${"white"};
    }
  
    // firefox
    &:focus-visible {
      outline: 0;
    }
  `,
);